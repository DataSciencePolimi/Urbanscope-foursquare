'use strict';

let async = require( 'async' );
let Tagger = require( './Tagger' );

let t = new Tagger();

//let tags_to_remove = [ /*'EXPO', */'URBANSCOPE_CITY', 'URBANSCOPE_PROVINCE' ];
//let tags_to_remove = [ 'categoryL1', 'categoryL2', 'categoryL3', 'categoryL4', 'URBANSCOPE_CATEGORY' ];
//let tags_to_remove = [ 'REGIONE', 'PROVINCIA', 'COMUNE' ];

let tags_to_remove = [ 'EXPO', 'URBANSCOPE_CITY', 'URBANSCOPE_PROVINCE', 'REGIONE', 'PROVINCIA', 'COMUNE', 'categoryL1', 'categoryL2', 'categoryL3', 'categoryL4', 'URBANSCOPE_CATEGORY' ];

async.eachSeries( tags_to_remove, ( tag, callback ) => {

	t.removeTag( tag, err => {
		return callback( err );
	});

}, err => {

	if ( err ) {
		console.log( err );
	}

	process.exit();

});