'use strict';

let CheckinsTable = require( './CheckinsTable' );

let _ = require( 'lodash' );
let config = require( '../config' );
let moment = require( 'moment' );
let mongoDB = require( 'mongodb' );
let fs = require( 'fs' );
let CSV = require( 'fast-csv' );

let db;

let venue_id = '4b3a2309f964a520806125e3';

let interval = {
	start: '2014-07-01',
	end: '2015-10-31'
};

let handle_deleted = false;

start();

function start() {

	initDB(( err ) => {

		if ( err ) console.log( err );

		fetchVenue(( err, venue ) => {

			if ( err ) console.log( err );

			let ct = new CheckinsTable();

			let table = ct.getTable({
				history: venue.history,
				interval: interval,
				handle_deleted: handle_deleted
			});

			let stats_by_days = ct.getStatsByDays( table, interval );
			let stats_by_months = ct.getStatsByMonths( table, interval );

			fs.writeFileSync( 'outputs/checkins_table.json', JSON.stringify( table, null, 2 ));
			fs.writeFileSync( 'outputs/checkins_stats_by_days.json', JSON.stringify( stats_by_days, null, 2 ));
			fs.writeFileSync( 'outputs/checkins_stats_by_months.json', JSON.stringify( stats_by_months, null, 2 ));

			let csv_days = _( stats_by_days )
			.map(( el, k ) => {
				return [ k, el ];
			})
			.value();

			let csv_months = _( stats_by_months )
			.map(( el, k ) => {
				return [ k, el ];
			})
			.value();

			CSV.writeToPath( 'outputs/checkins_table.csv', table.table, { headers: true } );
			CSV.writeToPath( 'outputs/checkins_stats_by_days.csv', csv_days, { headers: true } );
			CSV.writeToPath( 'outputs/checkins_stats_by_months.csv', csv_months, { headers: true } );

			db.close();

			//process.exit();

		});

	});

}

function initDB( callback ) {

	db = new mongoDB.Db( config.DB_NAME, new mongoDB.Server( config.DB_URL, config.DB_PORT ), { safe: true } );

	db.open(( err ) => {
		return callback( err );
	});

}

function fetchVenue( callback ) {

	db.collection( 'venues' ).find({
		id: venue_id
	}).toArray(( err, venues ) => {
		return callback( err, venues[0] );
	});

}