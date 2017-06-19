'use strict';

let async = require( 'async' );
let moment = require( 'moment' );
let VenuesCategorizer = require( './VenuesCategorizer' );
let Tagger = require( './Tagger' );
let MonthlyStats = require( './MonthlyStats' );
let RequestsCleaner = require( './RequestsCleaner' );

class Butler {

	constructor() {

	}

	start( callback ) {

		console.log( '### BUTLER ###' );
		console.log( '# ', moment().format() );

		async.series([
			
			function( callback ) {
				
				new VenuesCategorizer().start( err => {
					return callback( err );
				});
			
			},

			function( callback ) {
				
				new Tagger().start( err => {
					return callback( err );
				});
			
			},

			function( callback ) {

				new MonthlyStats().start( err => {
					return callback( err );
				});
				
			},

			function( callback ) {

				new RequestsCleaner().start( err => {
					return callback( err );
				});
				
			}
			
		], err => {

			console.log( '# ', moment().format() );

			if ( err ) {
				console.log( err );
			} else {
				console.log( '### BUTLER END ###' );
			}

		});

	}

}

module.exports = Butler;