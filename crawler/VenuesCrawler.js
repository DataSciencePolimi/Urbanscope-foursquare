'use strict';

//load modules
let _ = require( 'lodash' );
let async = require( 'async' );
let config = require( '../config' );
let cron = require( 'cron' );
let moment = require( 'moment' );
let mongoDB = require( 'mongodb' );

class VenuesCrawler {

	constructor( options ) {

		//properties
		this.db;
		this.job;
		this.venues_ids;

		this.name = options.name;
		this.find = options.find;
		this.cron_pattern = options.cron_pattern;
		this.minutes = options.minutes;

	}

	start() {

		this.initDB( err => {

			if ( err ) console.log( err );
			
			this.cronJob();

		});

	}

	initDB( callback ) {

		this.db = new mongoDB.Db( config.DB_NAME, new mongoDB.Server( config.DB_URL, config.DB_PORT ), { safe: true } );

		this.db.open( err => {
			return callback( err );
		});

	}

	cronJob() {
		
		this.job = new cron.CronJob( this.cron_pattern, () => {

			this.fetchVenues(() => {
				this.loadRequests();
			});
		
		}, null, true );

	}

	fetchVenues( callback ) {

		this.db.collection( 'venues' ).find( this.find, {
			id: 1,
			_id: 0
		}).toArray(( err, ids ) => {

			this.venues_ids = _( ids )
			.map( el => {
				return el.id
			})
			.value();

			//shuffle points
			this.venues_ids = _( this.venues_ids ).shuffle().value();

			return callback();
			
		});

	}

	loadRequests() {

		//requests per second
		let requests_per_second = this.venues_ids.length / ( this.minutes * 60 );

		let now = moment();
		
		let i = 0;

		//insert requests in the db
		async.eachSeries( this.venues_ids, ( venue_id, callback ) => {

			//calculate seconds to add
			let seconds_to_add = Math.floor( i / requests_per_second );

			let request = {
				name: this.name,
				type: 'venue',
				venue_id: venue_id,
				time_start: moment( now ).add( seconds_to_add, 's' ).toISOString(),
				time_end: moment( now ).add( ( seconds_to_add + 1 ), 's' ).toISOString()
			};

			i++;

			this.db.collection( 'requests' ).insert( request, {}, err => {

				console.log( '> request #%d inserted',( i - 1 ) );
				
				return callback( err );
		
			});

		}, err => {

			if ( err ) {
				console.log( err );
				process.exit();
			} else {
				console.log( '[%s] > %d requests inserted [%s]', this.name, this.venues_ids.length, moment().format() );
			}

		});

	}

}

module.exports = VenuesCrawler;