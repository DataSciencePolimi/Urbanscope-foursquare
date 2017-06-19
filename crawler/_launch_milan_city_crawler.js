'use strict';

let GridCrawler = require( './GridCrawler' );

let crawler = new GridCrawler({
	name: 'MILAN_CITY',
	grid: require( '../grid/grid_milan_city_mpp50_points_72807' ),
	cron_pattern: '0 0 6 * * *',
	minutes: 960
});

crawler.start();