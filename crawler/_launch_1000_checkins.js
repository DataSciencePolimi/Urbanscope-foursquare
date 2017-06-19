'use strict';

let VenuesCrawler = require( './VenuesCrawler' );

let crawler = new VenuesCrawler({
	name: 'MILAN_CITY',
	find: {
		'stats.checkinsCount': {
			$gte: 1000
		}
	},
	cron_pattern: '0 0 2,6,10,14,18,22 * * *',
	minutes: 240
});

crawler.start();