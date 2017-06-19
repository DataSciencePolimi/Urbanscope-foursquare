'use strict';

let GridCrawler = require( './GridCrawler' );

let crawler = new GridCrawler({
	name: 'MILAN_EXPO',
	grid: require( '../grid/grid_milan_expo_mpp25_points_1003' ),
	cron_pattern: '0 0 7,12,17,22 * * *',
	minutes: 300
});

crawler.start();