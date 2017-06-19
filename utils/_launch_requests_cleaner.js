'use strict';

let RequestsCleaner = require( './RequestsCleaner' );

new RequestsCleaner().start( err => {

	if ( err ) {
		console.log( err );
	}

	process.exit();

});