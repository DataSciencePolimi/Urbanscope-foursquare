'use strict';

let mongoDB = require( 'mongodb' );
let config = require( '../config' );
let moment = require( 'moment' );

class RequestsCleaner {

	constructor( options ) {
		this.db;
	}

	start( callback ) {

		callback = callback || function(){};

		console.log( '### REQUESTS CLEANER ###' );

		this.initDB( err => {
			this.clean( err => {

				this.db.close();

				return callback( err );
			
			})
		});

	}

	initDB( callback ) {

		this.db = new mongoDB.Db( config.DB_NAME, new mongoDB.Server( config.DB_URL, config.DB_PORT ), { safe: true } );

		this.db.open( err => {
			return callback( err );
		});

	}

	clean( callback ) {

		this.db.collection( 'requests' ).remove({
			time_end: {
				$lt: moment().subtract( 1, 'h' ).toISOString()
			}
		}, err => {

			if ( !err ) {
				console.log( '### END' );
			}

			return callback( err );
		
		});

	}

}

module.exports = RequestsCleaner;