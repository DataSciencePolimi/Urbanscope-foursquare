'use strict';

let mongoDB = require( 'mongodb' );
let config = require( '../config' );

class GeoTagger {

	constructor( options ) {

		this.db;
		this.feature = options.feature;
		this.tag_name = options.tag_name;
		this.tag_value = options.tag_value;

	}

	tag( callback ) {

		callback = callback || function(){};

		this.initDB( err => {
			this.updateVenues( err => {

				this.db.close();

				return callback( err );
			
			})
		});

	}

	initDB( callback ) {

		this.db = new mongoDB.Db( config.DB_NAME, new mongoDB.Server( config.DB_URL, config.DB_PORT ), { safe: true } );

		this.db.open( err => {
			return callback( err );
		});

	}

	updateVenues( callback ) {

		let set = {};
		set[ this.tag_name ] = this.tag_value;

		this.db.collection( 'venues' ).updateMany({
			loc: {
				$geoWithin: {
					$geometry: this.feature.geometry
				}
			}
		}, {
			$set: set
		}, ( err, result ) => {

			if ( !err ) {
				console.log( '> %d venues tagged as %s', result.modifiedCount, this.tag_name );
			}

			return callback( err );

		});

	}

}

module.exports = GeoTagger;