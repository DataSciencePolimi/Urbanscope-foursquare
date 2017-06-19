'use strict';

let async = require( 'async' );
let config = require( '../config' );
let mongoDB = require( 'mongodb' );
let apps = require( './apps' );

let db;

start();

function start() {

	initDB(( err ) => {
		insertApps();
	});

}

function initDB( callback ) {

	db = new mongoDB.Db( config.DB_NAME, new mongoDB.Server( config.DB_URL, config.DB_PORT ), { safe: true } );

	db.open(( err ) => {
		return callback( err );
	});

}

function insertApps() {

	async.each( apps, ( app, callback ) => {

		app.requests = [];

		db.collection( 'apps' ).insert( app, ( err ) => {
			return callback( err );
		});

	}, ( err ) => {

		console.log( '### APPS inserted in db' );

		process.exit();

	});

}