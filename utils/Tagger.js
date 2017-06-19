'use strict';

let async = require( 'async' );
let mongoDB = require( 'mongodb' );
let config = require( '../config' );
let nils = require( './NILS.json' );
let urbanscope_categories = require( './urbanscope_categories' );
let regioni = require( '../grid/regioni_light.json' );
let province = require( '../grid/province_light.json' );
let comuni = require( '../grid/comuni_light.json' );
let GeoTagger = require( './GeoTagger' );

class Tagger {

	constructor() {

		this.db;

		this.tags = [ 'EXPO', 'URBANSCOPE_CITY', 'URBANSCOPE_PROVINCE' ];

		this.features = [{
			feature: require( '../grid/milan_expo' ),
			tag_name: 'EXPO',
			tag_value: 1
		}];

	}

	start( callback ) {

		console.log( '### TAGGER ###' );

		callback = callback || function(){};

		async.series([
			this.initDB.bind( this ),
			this.setLocField.bind( this ),
			this.removeTags.bind( this ),
			this.tagFeatures.bind( this ),
			this.tagNils.bind( this ),
			this.tagRegioni.bind( this ),
			this.tagProvince.bind( this ),
			this.tagComuni.bind( this ),
			this.tagAsUrbanscope.bind( this )
		], err => {

			if ( !err ) {
				console.log( '### TAGGER END ###' );
			}

			this.db.close();

			return callback( err );
		
		});

	}

	initDB( callback ) {

		if ( !this.db ) {

			this.db = new mongoDB.Db( config.DB_NAME, new mongoDB.Server( config.DB_URL, config.DB_PORT ), { safe: true } );

			this.db.open( err => {
				return callback( err );
			});

		} else {
			return callback();
		}

	}

	setLocField( callback ) {

		console.log( '..setting loc fields..' );

		this.db.collection( 'venues' ).find({
			location: {
				$exists: true
			},
			loc: {
				$exists: false
			}
		}, {
			location: 1
		}).toArray(( err, venues ) => {
      console.log("TAGGER")
			async.each( venues, ( venue, callback ) => {

				let loc = [ venue.location.lng, venue.location.lat ];

				this.db.collection( 'venues' ).updateOne({
					_id: venue._id
				}, {
					$set: {
						loc: loc
					}
				}, err => {
					return callback( err );
				});

			}, err => {

				if ( !err ) {
					console.log( '> loc fields set to %d venues', venues.length );
				}

				return callback( err );
			
			});

		});

	}

	tagFeatures( callback ) {

		console.log( '..tagging features..' );

		async.eachSeries( this.features, ( feature, callback ) => {

			console.log( '..tagging %s venues..', feature.tag_name );

			new GeoTagger( feature ).tag( err => {

				if ( !err ) {
					console.log( '> tag %s done', feature.tag_name );
				}

				return callback( err );
			
			});

		}, err => {

			if ( !err ) {
				console.log( '> features tagged' );
			}

			return callback( err );
		
		});

	}

	tagNils( callback ) {

		console.log( '..tagging nils..' );

		async.eachSeries( nils.features, ( feature, callback ) => {

			console.log( '..tagging nil %d - %s..', feature.properties.ID_NIL, feature.properties.NIL );

			new GeoTagger({
				feature: feature,
				tag_name: 'NIL',
				tag_value: {
					id: feature.properties.ID_NIL,
					name: feature.properties.NIL
				}
			}).tag( err => {

				if ( !err ) {
					console.log( '> nil %s done', feature.properties.NIL );
				}

				return callback( err );

			});

		}, err => {

			if ( !err ) {
				console.log( '> nils tagged' );
			}

			return callback( err );
		
		});

	}

	tagRegioni( callback ) {

		console.log( '..tagging regioni..' );

		async.eachSeries( regioni.features, ( feature, callback ) => {

			console.log( '..tagging regione %d - %s..', feature.properties.COD_REG, feature.properties.REGIONE );

			new GeoTagger({
				feature: feature,
				tag_name: 'REGIONE',
				tag_value: {
					id: feature.properties.COD_REG,
					name: feature.properties.REGIONE
				}
			}).tag( err => {

				if ( !err ) {
					console.log( '> regione %s done', feature.properties.REGIONE );
				}

				return callback( err );

			});

		}, err => {

			if ( !err ) {
				console.log( '> regioni tagged' );
			}

			return callback( err );
		
		});

	}

	tagProvince( callback ) {

		console.log( '..tagging province..' );

		async.eachSeries( province.features, ( feature, callback ) => {

			console.log( '..tagging provincia %d - %s..', feature.properties.COD_PRO, feature.properties.PROVINCIA );

			new GeoTagger({
				feature: feature,
				tag_name: 'PROVINCIA',
				tag_value: {
					id: feature.properties.COD_PRO,
					name: feature.properties.PROVINCIA
				}
			}).tag( err => {

				if ( !err ) {
					console.log( '> provincia %s done', feature.properties.PROVINCIA );
				}

				return callback( err );

			});

		}, err => {

			if ( !err ) {
				console.log( '> province tagged' );
			}

			return callback( err );
		
		});

	}

	tagComuni( callback ) {

		console.log( '..tagging comuni..' );

		async.eachLimit( comuni.features, 10, ( feature, callback ) => {

			console.log( '..tagging comune %d - %s..', feature.properties.PRO_COM, feature.properties.COMUNE );

			new GeoTagger({
				feature: feature,
				tag_name: 'COMUNE',
				tag_value: {
					id: feature.properties.PRO_COM,
					name: feature.properties.COMUNE
				}
			}).tag( err => {

				if ( !err ) {
					console.log( '> comune %s done', feature.properties.COMUNE );
				}

				return callback( err );

			});

		}, err => {

			if ( !err ) {
				console.log( '> comuni tagged' );
			}

			return callback( err );
		
		});

	}

	tagAsUrbanscope( callback ) {

		console.log( '..tagging as urbanscope..' );

		async.series([

			callback => {

				// tag as URBANSCOPE_CITY

				this.db.collection( 'venues' ).updateMany({

					'COMUNE.name': 'Milano',
					NIL: {
						$exists: true
					},
					URBANSCOPE_CATEGORY: {
						$exists: true
					}

				}, {
					$set: {
						URBANSCOPE_CITY: 1
					}
				}, ( err, result ) => {

					if ( !err ) {
						console.log( '> %d venues tagged as URBANSCOPE_CITY', result.modifiedCount );
					}

					return callback( err );

				});

			},

			callback => {

				//tag as URBANSCOPE_PROVINCE

				this.db.collection( 'venues' ).updateMany({

					'PROVINCIA.name': 'Milano',
					URBANSCOPE_CATEGORY: {
						$exists: true
					}

				}, {
					$set: {
						URBANSCOPE_PROVINCE: 1
					}
				}, ( err, result ) => {

					if ( !err ) {
						console.log( '> %d venues tagged as URBANSCOPE_PROVINCE', result.modifiedCount );
					}

					return callback( err );

				});

			}

		], err => {
			return callback( err );
		});

	}

	removeTags( callback ) {

		async.eachSeries( this.tags, ( tag, callback ) => {

			this.removeTag( tag, err => {
				return callback( err );
			});

		}, err => {
			return callback( err );
		});

	}

	removeTag( tag_name, callback ) {

		console.log( '..removing tag %s..', tag_name );

		this.initDB( err => {

			let find = {};
			
			find[ tag_name ] = {
				$exists: true
			};

			let unset = {};
			unset[ tag_name ] = "";

			this.db.collection( 'venues' ).updateMany( find, {
				$unset: unset
			}, ( err, result ) => {

				if ( !err ) {
					console.log( '> tag %s removed from %d venues ', tag_name, result.modifiedCount );
				}

				return callback( err );

			});

		});

	}

}

module.exports = Tagger;
