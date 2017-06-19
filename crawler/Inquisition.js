'use strict';

let async = require( 'async' );
let config = require( '../config' );
let moment = require( 'moment' );
let mongoDB = require( 'mongodb' );
let Inquisitor = require( './Inquisitor' );

class Inquisition {

	constructor() {

		this.db;
		this.inquisitors = [];

	}

	start() {

		console.log( '### INQUISITION ###' );

		this.initDB(( err ) => {

			if ( err ) {
				console.log( err );
				process.exit();
			} else {
				this.loadInquisitors();
			}

		});

	}

	initDB( callback ) {

		this.db = new mongoDB.Db( config.DB_NAME, new mongoDB.Server( config.DB_URL, config.DB_PORT ), { safe: true } );

		this.db.open(( err ) => {
			return callback( err );
		});

	}

	loadInquisitors() {

		//fetch apps from db
		this.db.collection( 'apps' ).find().toArray(( err, apps ) => {

			apps.forEach(( app ) => {

				//load inquisitor
				let inquisitor = new Inquisitor( app );
				//push to inquisitors
				this.inquisitors.push( inquisitor );
				//start inquisition
				inquisitor.start();

			});


		});
	}

}

module.exports = Inquisition;