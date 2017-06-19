'use strict';

let Tagger = require( './Tagger' );

new Tagger().start( err => {

	if ( err ) {
		console.log( err );
	}

	process.exit();
	
});