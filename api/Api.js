'use strict';

let _ = require( 'lodash' );
let async = require( 'async' );
let moment = require( 'moment' );
let urbanscope_categories = require( '../utils/urbanscope_categories' );

class Api {

	constructor( options ) {

		this.db = options.db;

	}

	/**
	 * CHECKINS PER DISTRICT
	 * Returns json data about the amount of checkins in each districts.
	 *
	 * GET /checkins/district
	 * 
	 * startDate 	date		2014-09-01	start date to calculate the amount of checkins
	 * endDate		date		2014-11-30	end date to calculate the amount of checkins
	 * cat				string	null				By default returns all categories. Option: food, nigthlife_spot, etc
	 * (nil_ID)		array		null				By default returns all NIL or you can pass a list of ID: [1,34,76]
	 *
	  {
		  'startDate':'2014-09-01',
		  'endDate':'2014-11-30',
		  'cat':'food',
		  'nils':
		    [
		      { 'nil_id' : 34, 'value' : 60 },
		      { 'nil_id' : 87, 'value' : 3 },
		      { 'nil_id' : 29, 'value' : 13 },
		      ...
		    ]
		}
	 *
	 */
	getCheckinsPerDistrict( params, callback ) {

		//check params
		if ( !moment( params.dateStart ).isValid() ) {
			return callback( 'Invalid start date' );
		}

		if ( !moment( params.dateEnd ).isValid() ) {
			return callback( 'Invalid end date' );
		}

		let interval = {
			start: params.dateStart,
			end: params.dateEnd
		};

		//months
		let months = this.getMonthsInInterval( interval );

		months = _( months )
		.map( month => {
			return '$monthStats.' + month.start + '.checkins'
		})
		.value();

		//prepare query

		let match = {
			monthStats: {
				$exists: true
			}
		};

		let group = {
			value: {
				$sum: {
					$add: months
				}
			}
		};

		let project = {
			_id: 0,
			value: 1
		};

		let response = {
			startDate: interval.start,
			endDate: interval.end,
			cat: params.category
		};

		if ( params.type == 'city' ) {

			//match.URBANSCOPE_CITY = 1;
      match["$or"] = [{URBANSCOPE_CITY:1},{CITY2014:1}]
			
			//nils filter
			if ( params.nils && params.nils.length > 0 ) {
				match[ 'NIL.id' ] = {
					$in: params.nils
				}
			}

			group._id = '$NIL.id';

			project.nil_id = '$_id';

		} else {

			match.URBANSCOPE_PROVINCE = 1;
			
			//municipalities filter
			if ( params.municipalities && params.municipalities.length > 0 ) {
				match[ 'COMUNE.id' ] = {
					$in: params.municipalities
				}
			}

			group._id = '$COMUNE.id';

			project.municipality_id = '$_id';

		}

		//category filter
		if ( params.category ) {

			if ( urbanscope_categories[ params.category ] ) {
				match[ 'URBANSCOPE_CATEGORY' ] = urbanscope_categories[ params.category ].id;
			} else {
				return callback( 'Invalid category' );
			}

		}

		//exec query
		this.db.collection( 'venues' ).aggregate([
			{	$match: match },
			{ $group: group },
			{	$sort: { _id: 1 }	},
			{ $project: project }
		]).toArray(( err, result ) => {

			if ( err ) return callback( err );

			if ( params.type == 'city' ) {
				response.nils = result;
			} else {
				response.municipalities = result;
			}

			return callback( err, response );

		});

	}

	/**
	 * CHECKINS TIMELINE
	 * Returns json data about the amount of checkins by months.
	 *
	 * GET /checkins/timeline
	 *
	 * startDate	date		2014-09-01	start date to calculate amount of checkins
	 * endDate		date		2014-11-30	end date to calculate of checkins
	 * cat				string	null				By default returns all categories. Option: food, nigthlife_spot, etc
	 * 
		{
		  'startDate':'2014-09-01',
		  'endDate':'2014-11-30',
		  'cat':'food',
		  'timeline':
		    [
		      { 'date' : '2014-09-01', 'value' : 208 },
		      { 'date' : '2014-10-01', 'value' : 302 },
		      { 'date' : '2014-11-01', 'value' : 150 },
		      ...
		    ]
		}
	 */
	getCheckinsTimeline( params, callback ) {

		//check params
		if ( !moment( params.dateStart ).isValid() ) {
			return callback( 'Invalid start date' );
		}

		if ( !moment( params.dateEnd ).isValid() ) {
			return callback( 'Invalid end date' );
		}

		//prepare query

		let match = {
			monthStats: {
				$exists: true
			}
		};

		let group = {
			_id: null
		};

		let project = {
			_id: 0
		};

		if ( params.type == 'city' ) {
			//match.URBANSCOPE_CITY = 1;
      match['$or'] = [{URBANSCOPE_CITY:1},{CITY2014:1}]
		} else {
			match.URBANSCOPE_PROVINCE = 1;
		}

		//category filter
		if ( params.category ) {

			if ( urbanscope_categories[ params.category ] ) {
				match[ 'URBANSCOPE_CATEGORY' ] = urbanscope_categories[ params.category ].id;
			} else {
				return callback( 'Invalid category' );
			}

		}

		let interval = {
			start: params.dateStart,
			end: params.dateEnd
		};

		let months = this.getMonthsInInterval( interval );

		months.forEach( month => {

			group[ month.start ] = {
				$sum: '$monthStats.' + month.start + '.checkins'
			};

			project[ month.start ] = 1;
		
		});

		//exec query

		this.db.collection( 'venues' ).aggregate([{
		  $match: match
		}, {
	    $group: group
		}, {
			$project: project
		}]).toArray(( err, result ) => {

			if ( err ) return callback( err );

			let timeline = _( result[0] )
			.map(( el, k ) => {

				return {
					date: k,
					value: el
				};

			})
			.value();

			let response = {
				startDate: interval.start,
				endDate: interval.end,
				cat: params.category,
				timeline: timeline
			};

			return callback( err, response );

		});

	}

	/**
	 * CHECKINS VENUE
	 * Returns json data about the venues inside a specific NIL
	 *
	 * GET /checkins/venue
	 *
	 * startDate	date			2014-09-01	start date to calculate amount
	 * endDate		date			2014-11-30	end date to calculate amount
	 * nil_ID			integer		1						the ID of Nil
	 * cat				string		null				By default returns all categories. Option: food, nigthlife_spot, etc
	 *
		{
		  'startDate':'2014-09-01',
		  'endDate':'2014-11-30',
		  'nil_ID': 1,
		  'cat': 'food'
		  'venues':
		    [
		      {
		        name: 'locanda duomo',
		        cat: 'food',
		        lat: 45.07,
		        lon: 9.34,
		        checkins: 50
		            },
		      ...
		    ]
		}
	 */
	getVenuesCheckins( params, callback ) {

		//check params
		if ( !moment( params.dateStart ).isValid() ) {
			return callback( 'Invalid start date' );
		}

		if ( !moment( params.dateEnd ).isValid() ) {
			return callback( 'Invalid end date' );
		}

		let interval = {
			start: params.dateStart,
			end: params.dateEnd
		};

		//prepare query

		let match = {
			monthStats: {
				$exists: true
			}
		};

		let response = {
			startDate: interval.start,
			endDate: interval.end,
			cat: params.category
		};

		if ( params.type == 'city' ) {

			//match.URBANSCOPE_CITY = 1;
	    match['$or'] = [{URBANSCOPE_CITY:1},{CITY2014:1}]	
			//nil filter
			match[ 'NIL.id' ] = params.nil;

			response.nil_ID = params.nil;

		} else {

			match.URBANSCOPE_PROVINCE = 1;
		
			//municipality filter
			match[ 'COMUNE.id' ] = params.municipality;

			response.nil_ID = params.municipality;

		}

		//category filter
		if ( params.category ) {

			if ( urbanscope_categories[ params.category ] ) {
				match[ 'URBANSCOPE_CATEGORY' ] = urbanscope_categories[ params.category ].id;
			} else {
				return callback( 'Invalid category' );
			}

		}

		let months = this.getMonthsInInterval( interval );

		let add = [];

		let project = {
			_id: 0,
			name: 1,
			lat: 1,
			lon: 1,
			checkins: 1 
		};

		months.forEach( month => {
			add.push( '$monthStats.' + month.start + '.checkins' );
		});

		//exec query
		this.db.collection( 'venues' ).aggregate([{
			$match: match
		}, {
			$group: {
				_id: '$id',
				name: { $first: '$name' },
        lat: { $first: '$location.lat' },
        lon: { $first: '$location.lng' },
				checkins: {
					$sum: {
						$add: add
					}
				}
			}
		}, {
			$project: project
		}, {
			$sort: {
				checkins: -1
			}
		}]).toArray(( err, result ) => {

			if ( err ) return callback( err );

			let venues = _( result )
			.map( el => {

				el.cat = params.category;

				return el;

			})
			.value();

			response.venues = venues;

			return callback( err, response );

		});

	}

	/**
	 * TOP VENUE LIST
	 * Returns json data about the top venues
	 * 
	 * GET /top/venue
	 *
	 * startDate	date			2014-09-01	start date to calculate amount of checkins
	 * cat				string		null				By default returns all categories. Option: food, nigthlife_spot, etc
	 * limit			integer		10					the max number of venues to return
	 *
		{
		 'startDate':'2014-09-01',
		 'cat': 'food'
		 'venues':{
		   'prev':
		     [
		       {
		         name: 'locanda duomo',
		         cat: 'food',
		         lat: 45.07,
		         lon: 9.34,
		         checkins: 50
		           },
		       ...
		     ],
		   'curr':
		     [
		       {
		         name: 'locanda duomo',
		         cat: 'food',
		         lat: 45.07,
		         lon: 9.34,
		         checkins: 45
		       },
		       ...
		     ],
		   'next':
		     [
		       {
		         name: 'Eataly',
		         cat: 'food',
		         lat: 45.89,
		         lon: 9.27,
		         checkins: 69
		       },
		       ...
		     ]
		 }
		}
	 */
	getTopVenues( params, callback ) {

		//check params
		if ( !moment( params.dateStart ).isValid() ) {
			return callback( 'Invalid start date' );
		}

		let match = {
			monthStats: {
				$exists: true
			}
		};

		if ( params.type == 'city' ) {
			//match.URBANSCOPE_CITY = 1;
      match['$or']=[{URBANSCOPE_CITY:1},{CITY2014:1}]
		} else {
			match.URBANSCOPE_PROVINCE = 1;
		}

		//category filter
		if ( params.category ) {

			if ( urbanscope_categories[ params.category ] ) {
				match[ 'URBANSCOPE_CATEGORY' ] = urbanscope_categories[ params.category ].id;
			} else {
				return callback( 'Invalid category' );
			}

		}

		let response = {
			startDate: params.dateStart,
			cat: params.category,
			venues: {}
		};

		let query = ( month, callback ) => {

			this.db.collection( 'venues' ).aggregate([{
				$match: match
			}, {
				$group: {
					_id: '$id',
					name: { $first: '$name' },
					lat: { $first: '$location.lat' },
					lon: { $first: '$location.lng' },
					checkins: {
						$sum: {
							$add: [ '$monthStats.' + month + '.checkins' ]
						}
					},
				}
			}, {
				$project: {
					_id: 0,
					name: 1,
					lat: 1,
					lon: 1,
					checkins: 1
				}
			}, {
				$sort: {
					checkins: -1
				}
			}, {
				$limit: params.limit
			}]).toArray(( err, result ) => {

				let top = _( result )
				.map( el => {

					el.cat = params.category;

					return el;

				})
				.value();

				return callback( err, top );

			});

		};

		async.parallel([

			callback => {

				let month = moment( params.dateStart ).subtract( 1, 'M' ).startOf( 'month' ).format( 'YYYY-MM-DD' );

				query( month, ( err, result ) => {

					response.venues.prev = result;

					return callback();

				});

			},

			callback => {

				let month = moment( params.dateStart ).startOf( 'month' ).format( 'YYYY-MM-DD' );

				query( month, ( err, result ) => {

					response.venues.curr = result;

					return callback();

				});

			},

			callback => {

				let month = moment( params.dateStart ).add( 1, 'M' ).startOf( 'month' ).format( 'YYYY-MM-DD' );

				query( month, ( err, result ) => {

					response.venues.next = result;

					return callback();

				});

			}

		], err => {
			return callback( err, response );
		});

	}

	/**
	 * UTILS
	 */

	getMonthsInInterval( interval ) {

		let months = [];

		let interva_start = moment( interval.start ).startOf( 'month' );
		let interval_end = moment( interval.end ).endOf( 'month' );

		let month = interva_start;

		while ( month < interval_end ) {

			months.push({
				start: month.format( 'YYYY-MM-DD' ),
				end: month.endOf( 'month' ).format( 'YYYY-MM-DD' )
			});

			month.add( 1, 'M' ).startOf( 'month' );

		}

		return months;

	}

	sortDesc( array, key ) {
		
		return array.sort(( a, b ) => {
		        
	    let x = a[ key ];
	    let y = b[ key ];
	    
	    return ( ( x > y ) ? -1 : ( ( x < y ) ? 1 : 0 ) );
	  
	  });

	}

}

module.exports = Api;
