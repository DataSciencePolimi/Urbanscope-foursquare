//TODO
//- loggare gli errori
//- trattare gli errori di foursquare
//	- 504 problemi server
// 	- rate limit?
//	- timeout?

'use strict';

//load modules
let async = require( 'async' );
let config = require( '../config' );
let moment = require( 'moment' );
let mongoDB = require( 'mongodb' );

//constants declaration
const REQUESTS_HOUR_LIMIT = 5000;
const WAIT_TILL_MINUTES = 70; //minutes
const REQUEST_WINDOW_BEFORE = 3; //minutes
const REQUEST_WINDOW_AFTER = 1; //minutes
const NO_REQUESTS_TIME_TO_WAIT = 3 * 1000; //ms to wait when there are no requests

//class declaration
class Inquisitor {

	constructor( app ) {

		//class properties
		this.db;
		this.Foursquare;
		this.request;
		this.app;

		//set app property
		this.app = app;

		//load foursquare
		let config = {
			secrets: {
				clientId: this.app.client_id,
				clientSecret: this.app.client_secret,
				redirectUrl: 'http://www.foursquare.com'
			}
		};

		//set foursquare property
		this.Foursquare = require( 'node-foursquare' )( config );

	}

	/**
	 * START INQUISITOR
	 */
	start() {

		//load db connection
		this.initDB( err => {

			if ( err ) console.log( err );
			
			//start inquisition
			this.inquire();
		
		});

	}

	/**
	 * DB INITIALIZATION
	 */
	initDB( callback ) {

		this.db = new mongoDB.Db( config.DB_NAME, new mongoDB.Server( config.DB_URL, config.DB_PORT ), { safe: true } );

		this.db.open( err => {
			return callback( err );
		});

	}

	/**
	 * INQUIRE
	 */
	inquire() {

		console.log( '[%s] > %d/%d requests', this.app.name, this.app.requests.length, REQUESTS_HOUR_LIMIT );

		//check if there are free requests slots
		if ( this.app.requests.length < REQUESTS_HOUR_LIMIT ) {

			//process a new request

			async.series([
				this.fetchRequest.bind( this ),
				this.processRequest.bind( this ),
				this.updateAppRequests.bind( this )
			], err => {

				if ( err ) {

					if ( !err.type ) {
						console.log( err );
					}

				}
				
				//launch new inquisition
				this.inquire();
			
			});

		} else {

			//wait for new free requests slots
			//wait till => first processed request timestamp + 1h + 5m

			//calculate moving window end
			let wait_till = moment( this.app.requests[0] ).add( WAIT_TILL_MINUTES, 'm' );
			//now
			let now = moment();

			//milliseconds to wait
			let timeout = ( now < wait_till ) ? wait_till.diff( now ) : 1000;

			console.log( '# app %s stopped till %s', this.app.name, wait_till.format() );
			
			//wait till window end
			setTimeout(() => {

				this.updateAppRequests( err => {

					//launch new inquisition
					this.inquire();

				});

			}, timeout );
			
		}

	}

	/**
	 * FETCH A REQUEST FROM DB
	 */
	fetchRequest( callback ) {

		//fetch a request and delete it
		//fetch a request between [ now + REQUEST_WINDOW_BAFTER > x > now - REQUEST_WINDOW_BEFORE ]
		this.db.collection( 'requests' ).findOneAndDelete({
			time_start: {
				$gte: moment().subtract( REQUEST_WINDOW_BEFORE, 'm' ).toISOString()
			},
			time_end: {
				$lte: moment().add( REQUEST_WINDOW_AFTER, 'm' ).toISOString()
			}
		}, {
			$order: {
				time_start: 1
			}
		}, ( err, result ) => {

			//if there is a request to process
			if (  result && result.value ) {

				//set the current request
				this.request = result.value;

				return callback( err );

			} else {

				//console.log( '[%s] > waiting for requests to process', this.app.name );

				//wait
				setTimeout(() => {

					return callback({
						type: 'no_request'
					});

				}, NO_REQUESTS_TIME_TO_WAIT );

			}

		});

	}

	/**
	 * PROCESS A REQUEST
	 */
	processRequest( callback ) {

		//add this request to app requests
		this.app.requests.push( moment().toISOString() );

		if ( this.request.type == 'point' ) {

			//process request by grid point
			this.requestByPoint( callback );

		} else {

			//process request by venue id
			this.requestById( callback );

		}

	}

	/**
	 * PROCESS A REQUEST BY POINT
	 */
	requestByPoint( callback ) {

		console.log( '[%s] > processing POINT request on [%d,%d]', this.app.name, this.request.point.lat, this.request.point.lng );

		//call foursquare api
		this.Foursquare.Venues.search( this.request.point.lat, this.request.point.lng, '', { intent: 'browse', radius: this.request.point.radius }, '', ( err, result ) => {

			if ( err ) {
				console.log( err );
				return callback( err );
			} else {

				if ( result.venues.length > 0 ) {
					console.log( '[%s] > %d venues found', this.app.name, result.venues.length );
				}

				//for each venue found
				async.each( result.venues, this.processVenue.bind( this ), err => {
					return callback( err );
				});

			}
				
		});

	}

	/**
	 * PROCESS A REQUEST BY VENUE ID
	 */
	requestById( callback ) {

		console.log( '[%s] > processing VENUE request by id %s', this.app.name, this.request.venue_id );

		//call foursquare api
		this.Foursquare.Venues.getVenue( this.request.venue_id, '', ( err, result ) => {

			if ( err ) {
				console.log( err );
				return callback( err );
			} else {
				this.processVenue( result.venue, callback );
			}
			
		});

	}

	/**
	 * PROCESS A VENUE OBJECT
	 */
	processVenue( venue, callback ) {

		//save a stats snapshot
		let snapshot = {
			checkinsCount: venue.stats.checkinsCount,
			usersCount: venue.stats.usersCount,
			tipCount: venue.stats.tipCount,
			visitsCount: venue.stats.visitsCount,
			date: moment().toISOString()
		}

		//check if venue already exists
		this.db.collection( 'venues' ).findOne({
			id: venue.id
		}, {}, ( err, result ) => {

			if ( result ) {

				//venue already exists

				//check if ids match
				if ( result.id == venue.id ) {

					//ids match

					let update_query = {
						$set: {
							name: venue.name,
							categories: venue.categories,
							createdAt: venue.createdAt,
							stats: venue.stats
						}
					};

					//check if stats have changed from last inquisition
					if ( result.stats.checkinsCount != snapshot.checkinsCount ) {

						snapshot.index = result.history.length;

						update_query.$push = {
							history: snapshot
						};

						console.log( '[%s] > [%d] checkins for "%s"', this.app.name, ( snapshot.checkinsCount - result.stats.checkinsCount ), venue.name );
					
					}

					//update venue
					this.db.collection( 'venues' ).update({
						_id: result._id
					}, update_query, err => {
						return callback( err );
					});

				} else {

					//ids don't match

					console.log( '[%s] > id mismatch for venue "%s"', this.app.name, venue.name );

					//delete this venue
					db.collection( 'venues' ).remove({ _id: result._id }, err => {
						return callback( err );
					});

				}

			} else {

				//venue doesn't exist yet

				console.log( '[%s] > new venue "%s"', this.app.name, venue.name );

				snapshot.index = 0;

				//parse venue
				let _venue = {
					id: venue.id,
					name: venue.name,
					location: venue.location,
					categories: venue.categories,
					verified: venue.verified,
					stats: venue.stats,
					specials: venue.specials,
					hereNow: venue.hereNow,
					referralId: venue.referralId,
					__v: venue.__v,
					createdAt: venue.createdAt,
					history: [ snapshot ],
					monthStats: {}
				};

				//insert venue
				this.db.collection( 'venues' ).insert( _venue, {}, err => {
					return callback( err );
				});

			}

		});

	}

	/**
	 * UPDATE APP REQUESTS
	 */
	updateAppRequests( callback ) {

		//requests length
		let n_reqs = this.app.requests.length;
		//calculate window start => now - 1h
		let window_start = moment().subtract( 1, 'h' );

		//remove elements prior to window start
		for ( let i = 0; i < n_reqs; i++ ) {

			if ( moment( this.app.requests[i] ) > window_start ) {
				this.app.requests = this.app.requests.slice(i);
				break;
			
			}

		}

		//update app
		this.db.collection( 'apps' ).update({
			_id: this.app._id
		}, {
			$set: {
				requests: this.app.requests
			}
		}, ( err, result ) => {
			return callback( err );
		});

	}

}

module.exports = Inquisitor;