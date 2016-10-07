var request = require('request');
var _ = require('lodash');

var url = 'https://coinbase.com/api/v1/currencies/exchange_rates';

function buy(amount, currency) {
	request(url, (err, res, body) => {
		if (!err && res.statusCode == 200) {
			var conversions = JSON.parse(body);

			if (currency) {
				var key = currency + '_to_btc';
				console.log(conversions[key]);
			}
		}
	});
}

buy(20, 'usd');
