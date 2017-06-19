'use strict';

let Butler = require( './Butler' );
let cron = require( 'cron' );

let butler = new Butler();

let job = new cron.CronJob( '0 0 2 * * *', () => {
	
	butler.start( err => {

		if ( err ) {
			console.log( err );
		}
		
	});

}, null, true );