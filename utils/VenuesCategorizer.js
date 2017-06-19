'use strict';

let _ = require( 'lodash' );
let async = require( 'async' );
let config = require( '../config' );
let mongoDB = require( 'mongodb' );
let category_hierarchy = require( './category_hierarchy_update' );
let urbanscope_categories = require( './urbanscope_categories' );

class VenuesCategories {

	constructor() {

		this.db;
		this.categories = category_hierarchy.response.categories;

	}

	start( callback ) {

		console.log( '### CATEGORIZATION ###' );

		async.series([
			this.initDB.bind( this ),
			this.processCategories.bind( this ),
			this.setUrbanscopeCategories.bind( this )
		], function( err ) {

			if ( !err ) {
				console.log( '### CATEGORIZATION END ###' );
			}

			this.db.close();

			return callback( err );

		}.bind( this ));

	}

	initDB( callback ) {

		this.db = new mongoDB.Db( config.DB_NAME, new mongoDB.Server( config.DB_URL, config.DB_PORT ), { safe: true } );

		this.db.open(( err ) => {
			return callback( err );
		});

	}

	processCategories( callback ) {

		//recursive function
		let recursive = function( category, hierarchy, hierarchies ) {

			hierarchy.push({
				id: category.id,
				name: category.name
			});

			if ( category.categories && category.categories.length > 0 ) {

				category.categories.forEach( subcategory => {
					recursive( subcategory, hierarchy.slice(0), hierarchies );
				});

			} else {

				hierarchies.push( hierarchy );
				return;
			
			}

		}

		let hierarchies = [];

		this.categories.forEach( category => {
			recursive( category, [], hierarchies );
		});

		async.each( hierarchies, ( hierarchy, callback ) => {

			this.db.collection( 'venues' ).update({
				'categories.0.id': hierarchy[ hierarchy.length - 1 ].id
			}, {
				$set: {
					categoryHierarchy: hierarchy
				}
			}, {
				multi: true
			}, err => {

				console.log( _.map( hierarchy, 'name' ).join( ' > ' ) );

				return callback( err );

			});

		}, err => {
			return callback( err );
		});

	}

	setUrbanscopeCategories( callback ) {

		//recursive function
		let recursive = function( category, hierarchy, hierarchies ) {

			hierarchy.push({
				id: category.id,
				name: category.name
			});

			if ( category.categories && category.categories.length > 0 ) {

				category.categories.forEach( subcategory => {
					recursive( subcategory, hierarchy.slice(0), hierarchies );
				});

			} else {

				hierarchies.push( hierarchy );
				return;
			
			}

		}

		let hierarchies = [];

		for ( let k in urbanscope_categories ) {
			recursive( urbanscope_categories[k], [], hierarchies );
		}

		async.each( hierarchies, ( hierarchy, callback ) => {
		
			this.db.collection( 'venues' ).update({
				'categoryHierarchy.id': hierarchy[ hierarchy.length - 1 ].id
			}, {
				$set: {
					URBANSCOPE_CATEGORY: hierarchy[0].id
				}
			}, {
				multi: true
			}, err => {

				console.log( _.map( hierarchy, 'name' ).join( ' > ' ) );

				return callback( err );
			
			});

		}, err => {
			return callback( err );
		});

	}

}

module.exports = VenuesCategories;
