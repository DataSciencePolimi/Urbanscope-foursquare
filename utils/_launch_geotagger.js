'use strict';

let GeoTagger = require( './GeoTagger' );

new GeoTagger({
	feature: require( '../grid/' ).features[0],
	tag_name: '',
	tag_value: 1
}).tag( err => {
 
	if ( err ) {
		console.log( err );
	} else {
		console.log( '# DONE' );
	}
		
});