'use strict';

let MonthlyStats = require( './MonthlyStats' );

new MonthlyStats().start( err => {
  console.log("lol")
	if ( err ) {
		console.log( err );
	}

	process.exit();

});
