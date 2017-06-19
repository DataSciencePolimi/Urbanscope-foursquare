'use strict';

let VenuesCategorizer = require( './VenuesCategorizer' );

new VenuesCategorizer().start( err => {

	if ( err ) {
		console.log( err );
	}

	process.exit();

});