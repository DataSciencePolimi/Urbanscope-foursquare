'use strict';

let Butler = require( './Butler' );
let cron = require( 'cron' );

let butler = new Butler();

butler.start( err => {

	if ( err ) {
		console.log( err );
	}

	process.exit();
	
});