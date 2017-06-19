'use strict';

let _ = require( 'lodash' );
let async = require( 'async' );
let config = require( '../config' );
let express = require( 'express' );
let http = require( 'http' );
let moment = require( 'moment' );
let mongoDB = require( 'mongodb' );
let Api = require( './Api' );

class Server {

	constructor() {

		this.app;
		this.api;
		this.db;
		this.server;

	}

	start() {

		async.series([
			this.initDB.bind( this ),
			this.initServer.bind( this ),
			this.loadApi.bind( this )
		], err => {

			if ( err ) {
				console.log( err );
				process.exit();
			} else {
				this.startServer();
			}

		});

	}

	initDB( callback ) {

		this.db = new mongoDB.Db( config.DB_NAME, new mongoDB.Server( config.DB_URL, config.DB_PORT ), { safe: true } );

		this.db.open( err => {
			return callback( err );
		});

	}

	initServer( callback ) {

		this.app = express();

		this.app.use(( req, res, next ) => {
		  res.header( 'Access-Control-Allow-Origin', '*' );
		  res.header( 'Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept' );
		  next();
		});

		this.server = http.createServer( this.app );

		return callback();

	}

	startServer( callback ) {

		this.server.listen( config.SERVER_PORT );
		
		console.log( '### API SERVER running on port %s ###', config.SERVER_PORT );

	}

	loadApi( callback ) {

		//istantiate Api object
		this.api = new Api({
			db: this.db
		});

		let processResponse = ( res, path, request_start_time, params, err, response ) => {

			let request_execution_time = moment().diff( request_start_time, 'milliseconds' );

			console.log( '\n**********' );
			console.log( '[%s] %s [%dms]', request_start_time.format(), path, request_execution_time );
			console.log( params );

			if ( err ) {

				console.log( '\nERROR' );
				console.log( err.message );

				res.status( 500 ).send( err );

			} else {
				res.status( 200 ).send( response );
			}

		};

		/**
		 * TEST
		 */
		this.app.get( '/api', ( req, res ) => {

			let message = '-(#V#)8   -(#V#)8   ..le api ronzano..   -(#V#)8';
			
			res.status( 200 ).send( message );

		});

		/**
		 * GET /api/checkins/district
		 */
		this.app.get( '/api(/city)?/checkins/district', ( req, res ) => {

			//get params
			let params = {
				type: 'city',
				dateStart: req.query.startDate || config.DATA_START,
				dateEnd: req.query.endDate || moment().endOf( 'month' ).format( 'YYYY-MM-DD' ),
				category: req.query.cat || '',
				nils: req.query.nil_ID ? JSON.parse( req.query.nil_ID ) : []
			};

			this.api.getCheckinsPerDistrict( params, _.partial( processResponse, res, 'GET /api/city/checkins/district', moment(), params ) );

		});

		this.app.get( '/api/province/checkins/district', ( req, res ) => {

			//get params
			let params = {
				type: 'province',
				dateStart: req.query.startDate || config.DATA_START,
				dateEnd: req.query.endDate || moment().endOf( 'month' ).format( 'YYYY-MM-DD' ),
				category: req.query.cat || '',
				municipalities: req.query.municipality_ID ? JSON.parse( req.query.municipality_ID ) : []
			};

			this.api.getCheckinsPerDistrict( params, _.partial( processResponse, res, 'GET /api/province/checkins/district', moment(), params ) );

		});

		/**
		 * GET /api/checkins/timeline
		 */
		this.app.get( '/api(/city)?/checkins/timeline', ( req, res ) => {

			let params = {
				type: 'city',
				dateStart: req.query.startDate || config.DATA_START,
				dateEnd: req.query.endDate || moment().endOf( 'month' ).format( 'YYYY-MM-DD' ),
				category: req.query.cat || ''
			};

			this.api.getCheckinsTimeline( params, _.partial( processResponse, res, 'GET /api/city/checkins/timeline', moment(), params ) );

		});

		this.app.get( '/api/province/checkins/timeline', ( req, res ) => {

			let params = {
				type: 'province',
				dateStart: req.query.startDate || config.DATA_START,
				dateEnd: req.query.endDate || moment().endOf( 'month' ).format( 'YYYY-MM-DD' ),
				category: req.query.cat || ''
			};

			this.api.getCheckinsTimeline( params, _.partial( processResponse, res, 'GET /api/province/checkins/timeline', moment(), params ) );

		});

		/**
		 * GET /api/checkins/venue
		 */
		this.app.get( '/api(/city)?/checkins/venue', ( req, res ) => {

			let params = {
				type: 'city',
				dateStart: req.query.startDate || config.DATA_START,
				dateEnd: req.query.endDate || moment().endOf( 'month' ).format( 'YYYY-MM-DD' ),
				category: req.query.cat || '',
				nil: req.query.nil_ID ? parseInt( req.query.nil_ID ) : 1,
				limit: req.query.limit ? parseInt( req.query.limit ) : null
			};

			this.api.getVenuesCheckins( params, _.partial( processResponse, res, 'GET /api/city/checkins/venue', moment(), params ) );

		});

		this.app.get( '/api/province/checkins/venue', ( req, res ) => {

			let params = {
				type: 'province',
				dateStart: req.query.startDate || config.DATA_START,
				dateEnd: req.query.endDate || moment().endOf( 'month' ).format( 'YYYY-MM-DD' ),
				category: req.query.cat || '',
				municipality: req.query.municipality_ID ? parseInt( req.query.municipality_ID ) : 1,
				limit: req.query.limit ? parseInt( req.query.limit ) : null
			};

			this.api.getVenuesCheckins( params, _.partial( processResponse, res, 'GET /api/province/checkins/venue', moment(), params ) );

		});

		/**
		* GET /api/top/venue
		*/
		this.app.get( '/api(/city)?/top/venue', ( req, res ) => {

			let params = {
				type: 'city',
				dateStart: req.query.startDate || config.DATA_START,
				category: req.query.cat || '',
				limit: req.query.limit ? parseInt( req.query.limit ) : 10
			};

			this.api.getTopVenues( params, _.partial( processResponse, res, 'GET /api/city/top/venue', moment(), params ) );

		});

		this.app.get( '/api/province/top/venue', ( req, res ) => {

			let params = {
				type: 'province',
				dateStart: req.query.startDate || config.DATA_START,
				category: req.query.cat || '',
				limit: req.query.limit ? parseInt( req.query.limit ) : 10
			};

			this.api.getTopVenues( params, _.partial( processResponse, res, 'GET /api/province/top/venue', moment(), params ) );

		});

		/**
		 * GET /api/top/timeline
		 */
		this.app.get( '/api(/city)?/top/timeline', ( req, res ) => {

			let params = {
				type: 'city',
				dateStart: req.query.startDate || config.DATA_START,
				dateEnd: req.query.endDate || moment().endOf( 'month' ).format( 'YYYY-MM-DD' ),
				category: req.query.cat || ''
			};

			this.api.getCheckinsTimeline( params, _.partial( processResponse, res, 'GET /api/city/top/timeline', moment(), params ) );

		});

		this.app.get( '/api/province/top/timeline', ( req, res ) => {

			let params = {
				type: 'province',
				dateStart: req.query.startDate || config.DATA_START,
				dateEnd: req.query.endDate || moment().endOf( 'month' ).format( 'YYYY-MM-DD' ),
				category: req.query.cat || ''
			};

			this.api.getCheckinsTimeline( params, _.partial( processResponse, res, 'GET /api/province/top/timeline', moment(), params ) );

		});

		return callback();

	}

}

module.exports = Server;