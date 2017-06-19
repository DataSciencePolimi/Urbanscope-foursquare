'use strict';

//load modules
let _ = require( 'lodash' );
let async = require( 'async' );
let config = require( '../config' );
let cron = require( 'cron' );
let moment = require( 'moment' );
let mongoDB = require( 'mongodb' );

class GridCrawler {

	constructor( options ) {

		//properties
		this.db;
		this.job;
		this.name = options.name;
		this.grid = options.grid;
		this.cron_pattern = options.cron_pattern;
		this.minutes = options.minutes;

	}

	start() {

		this.initDB(( err ) => {

			if ( err ) console.log( err );
			
			this.cronJob();

		});

	}

	initDB( callback ) {

		this.db = new mongoDB.Db( config.DB_NAME, new mongoDB.Server( config.DB_URL, config.DB_PORT ), { safe: true } );

		this.db.open(( err ) => {
			return callback( err );
		});

	}

	cronJob() {

		this.job = new cron.CronJob( this.cron_pattern, () => {
			this.loadRequests();
		}, null, true );
		
	}

	loadRequests() {

		let points = [];
		
		//parse points from grid
		this.grid.features.forEach(function( feature ) {

			let radius = feature.properties.mpp;

			feature.geometry.coordinates.forEach(( point ) => {

				points.push({
					lat: point[1],
					lng: point[0],
					radius: radius
				});

			});

		});

		//shuffle points
		points = _( points ).shuffle().value();

		//requests per second
		let requests_per_second = points.length / ( this.minutes * 60 );

		let now = moment();
		
		let i = 0;

		//insert requests in the db
		async.eachSeries( points, ( point, callback ) => {

			//calculating seconds to add
			let seconds_to_add = Math.floor( i / requests_per_second );

			let request = {
				name: this.name,
				type: 'point',
				intent: 'browse',
				point: point,
				time_start: moment( now ).add( seconds_to_add, 's' ).toISOString(),
				time_end: moment( now ).add( ( seconds_to_add + 1 ), 's' ).toISOString()
			};

			i++;

			this.db.collection( 'requests' ).insert( request, {}, ( err ) => {

				console.log( '> request #%d inserted',( i - 1 ) );
				
				return callback( err );
		
			});

		}, ( err ) => {

			if ( err ) {
				console.log( err );
				process.exit();
			} else {
				console.log( '[%s] > %d requests inserted [%s]', this.name, points.length, moment().format() );
			}

		});

	}

}

module.exports = GridCrawler;