'use strict';

let _ = require( 'lodash' );
let moment = require( 'moment' );

class CheckinsTable {

	constructor() {

		this.interval = {
			start: '2014-07-01',
			end: moment().endOf( 'month' ).format( 'YYYY-MM-DD' )
		};

	}

	getTable( options ) {

		//checkins table
		let table;
		//checkins before the interval
		let checkins_before;
		//checkins after the interval
		let checkins_after;

		//set venue history
		let history = options.history;
		//set  interval
		let interval = options.interval || this.interval;
		//numbers of days before and after the interval to consider
		let margin = options.margin || 1;
		//option to resolve deleted checkins
		let isHandleDeleted = options.handle_deleted != null ? options.handle_deleted : true;
		
		//hour slots per day
		let slots = 6;

		//normalize interval start date
 		let date_start = moment( interval.start ).startOf( 'day' );
		//normalize interval end date
		let date_end = moment( interval.end ).endOf( 'day' );
		//interval in days
		let interval_days = ( this.getDaysDifference( date_end, date_start ) ) + 1;

		let date_before = moment( date_start ).subtract( margin, 'd' );
		let date_after = moment( date_end ).add( margin, 'd' );

		let isFirstInInterval = true;

		//for each snapshot
		for ( let i = 0; i < history.length; i++ ) {
			
			let snapshot = history[i];

			//snapshot date
			let date = moment( snapshot.date );
			//snapshot checkins
			let checkins = snapshot.checkinsCount;

			//if before the interval
			if ( date < date_start ) {

				//if inside margin before
				if ( date >= date_before ) {
					//update checkins before
					checkins_before = checkins;
				}

			//if beteen interval
			} else if ( date >= date_start  && date <= date_end ) {
				
				//if checkins before is not set
				if ( !checkins_before ) {
					//set current checkins as before checkins
					checkins_before = checkins;
				}

				//if first time inside the interval
				if ( isFirstInInterval ) {

					isFirstInInterval = false;

					//initialize checkins table
					table = [];

					//set the before chekins value for every cell
					for ( let j = 0; j < interval_days; j++ ) {

						table[j] = [];
						
						for ( let k = 0; k < slots; k++ ) {
							table[j].push( checkins_before );
						}

					}

				}

				//day index
				let d = this.getDaysDifference( date_start, date );
				//slot index
				let s = Math.floor( date.hours() / 4 );

				//set current checkins in the table
				//from the current day and slot to the end
				for ( d; d <interval_days; d++ ) {

					for ( s; s < slots; s++ ) {
						table[d][s] = checkins;
					}

					s = 0;

				}

			//if after interval
			} else {

				//if inside margin after
				if ( date < date_after ) {
					//set current checkins as after checkins
					checkins_after = checkins;
				}

				//exit loop
				break;

			}

		}
	
		//if table doesn't exist
		if ( !table ) {
			//there weren't checkins in the interval
			return null;
		}

		//if after checkins isn't set
		if ( !checkins_after ) {
			//set last table value as after checkins
			checkins_after = table[ interval_days - 1 ][ slots - 1 ];
		}

		//if before checkins count is greater than the first element in the interval
		if ( checkins_before > table[0][0] ) {
			//set it to first table value
			checkins_before = table[0][0];
		}

		//calculate total number of checkins in the interval
		let checkins_tot = table[ interval_days - 1 ][ slots - 1 ] - checkins_before;

		let data_table = {
			table: table,
			checkins_before: checkins_before,
			checkins_after: checkins_after,
			checkins_tot: checkins_tot
		};

		if ( isHandleDeleted ) {
			//manage deleted checkins in the interval
			data_table = this.handleDeleted( data_table );
		}

		return data_table;

	}

	handleDeleted( data_table ) {
		
		//set last valid number of checkins
		let last = data_table.checkins_after;
		//initialize the global difference
		let last_diff = 0;

		//loop the table backwards
		for ( let i = data_table.table.length - 1; i >= 0; i-- ) {

			for ( let j = 5; j >= 0; j-- ) {

				//subtract the global difference to the current element
				data_table.table[i][j] -= last_diff;

				//calculate the current difference between the element and the last valid
				let diff = last - data_table.table[i][j];

				//if the difference is negative, some checkins were deleted
				if ( diff < 0 ) {

					//increment the global difference
					last_diff += -diff;
					//subtract the current difference to the element
					data_table.table[i][j] += diff;

				} else {

					//reset the global difference
					last_diff = 0;
					//set the current element as last valid
					last = data_table.table[i][j];

				}

			}

		}

		if ( data_table.checkins_before > data_table.table[0][0] ) {
			data_table.checkins_before = data_table.table[0][0];
		}

		//calculate total number of checkins in the interval
		data_table.checkins_tot = data_table.table[ data_table.table.length - 1 ][ 5 ] - data_table.checkins_before;

		return data_table;

	}

	getDaysDifference( d1, d2 ) {

		d1 = moment( d1 ).startOf( 'day' );
		d2 = moment( d2 ).startOf( 'day' );

		return Math.abs( d1.diff( d2, 'days' ) );

	}

	getStatsByDays( data_table, _interval ) {

		let interval = _interval || this.interval;

		let days_stats = _( data_table.table )
		.map(( day, i, days ) => {

			let checkins_before = days[ i - 1 ] ? days[ i - 1 ][5] : data_table.checkins_before;
			let checkins_after = days[ i + 1 ] ? days[ i + 1 ][0] : data_table.checkins_after;

			let checkins = 
				Math.round( ( checkins_after + day[5] ) / 2 ) - 
				Math.round( ( day[0] + checkins_before ) / 2 );

			return checkins;

		})
		.indexBy(( checkins, i ) => {

			return moment( interval.start ).add( i, 'd' ).format( 'YYYY-MM-DD' );
		})
		.value();

		return days_stats;

	}

	getStatsByMonths( data_table, _interval ) {

		let interval = _interval || this.interval;

		let stats_by_days = this.getStatsByDays( data_table, interval );

		let stats_by_months = {};

		for ( let k in stats_by_days ) {

			let month = moment( k ).startOf( 'month' ).format( 'YYYY-MM-DD' );

			if ( !stats_by_months[ month ] ) {
				stats_by_months[ month ] = 0;
			}

			stats_by_months[ month ] += stats_by_days[k];

		}

		return stats_by_months;

	}

}

module.exports = CheckinsTable;
