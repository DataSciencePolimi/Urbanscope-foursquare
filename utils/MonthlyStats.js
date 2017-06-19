'use strict';

let _ = require( 'lodash' );
let async = require( 'async' );
let config = require( '../config' );
let moment = require( 'moment' );
let mongoDB = require( 'mongodb' );
let CheckinsTable = require( './CheckinsTable' );

class MonthlyStats {

	constructor() {

		this.db;
		this.venues;

	}

	start( callback ) {

		console.log( '### MONTHLY STATS ###' );

		callback = callback || function(){};

		async.series([
			this.initDB.bind( this ),
			this.fetchVenues.bind( this ),
			this.calculateMonthlyStats.bind( this )
		], err => {

			if ( !err ) {
				console.log( '### MONTHLY STATS END ###' );
			}

			this.db.close();

			return callback( err );

		});

	}

	initDB( callback ) {

		this.db = new mongoDB.Db( config.DB_NAME, new mongoDB.Server( config.DB_URL, config.DB_PORT ), { safe: true } );

		this.db.open( err => {

      this.db.on("error",(err)=>{
        console.log(err)
      })

			return callback( err );
		});

	}

	fetchVenues( callback ) {
    
    this.venues = []
		console.log( '..fetching venues..' );
		var cursor = this.db.collection( 'venues' ).find({
			$or: [{
				URBANSCOPE_CITY: 1
			}, {
				URBANSCOPE_PROVINCE: 1
			},{
        CITY2014:1
      }]
		}, {
			id: 1,
			name: 1,
      history:1
		});
    var last = false;
    async.whilst(()=>!last,
          (cb)=>{
            cursor.next()
              .then((result)=>{
                last = !result;
                if (result) {
                   this.venues.push(result);
                   console.log('%s venues fetched',this.venues.length);
                } else { 
                   console.log('%s venues fetched totally',this.venues.length);
                } 
                
                cb();
              })
              .catch((err)=>cb(err));
          },callback);
	}

	calculateMonthlyStats( callback ) {

		console.log( '..calculating monthly stats..' );

		async.eachLimit( this.venues, 100, ( venue, callback ) => {

			let ct = new CheckinsTable();
			
			let data_table = ct.getTable({
				history: venue.history
			});

			if ( data_table ) {

				let monthly_stats = ct.getStatsByMonths( data_table );

				let _monthly_stats = {};

				for ( let month in monthly_stats ) {

					_monthly_stats[ month ] = {
						start: month,
						end: moment( month ).endOf( 'month' ).format( 'YYYY-MM-DD' ),
						checkins: monthly_stats[ month ]
					};

				}

				this.db.collection( 'venues' ).update({
					_id: venue._id
				}, {
					$set: {
						monthStats: _monthly_stats
					}
				}, err => {

					console.log( '> updated monthly stats for "%s"', venue.name );

					return callback( err );

				});

			} else {
				return callback();
			}

		}, err => {

			if ( !err ) {
				console.log( '> monthly stats calculated' );
			}

			return callback( err );
		
		});

	}

}

module.exports = MonthlyStats;
