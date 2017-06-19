'use strict';

let GridCrawler = require( './GridCrawler' );

let crawler = new GridCrawler({
	name: 'MILAN_PROVINCE',
	grid: require( '../grid/grid_milan_province_no_city_mpp_200_points_34992' ),
	cron_pattern: '0 0 6 * * *',
	minutes: 960
});

crawler.start();