'use strict';

let GridCrawler = require( './GridCrawler' );

let crawler = new GridCrawler({
	name: 'AEROTRAIN',
	grid: require( '../grid/grid_aerotrain_mpp_50_points_989' ),
	cron_pattern: '0 30 1,3,5,7,9,11,13,15,17,19,21,23 * * *',
	minutes: 120
});

crawler.start();