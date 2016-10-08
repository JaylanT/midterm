#!/usr/bin/env node

const request = require('request');
const _ = require('lodash');

const URL = 'https://coinbase.com/api/v1/currencies/exchange_rates';
const BUY = 'BUY';
const SELL = 'SELL';

function buy(amount, currency) {
	initiateTransaction(amount, currency, BUY);
}

function sell(amount, currency) {
	initiateTransaction(amount, currency, SELL);
}

function orders() {

}

function initiateTransaction(amount, currency, type) {
	if (isNaN(amount) || amount <= 0) {
		console.log('No amount specified');
		return;
	}
	
	getBTCConversions((conversions) => {
		const transaction = createTransaction(amount, currency, type, conversions);

		if (transaction) {
			ordersQueue.push(transaction);
			printTransaction(transaction);
		}
	});
}

function createTransaction(amount, currency, type, conversions) {
	const transaction = {
		amount: amount,
		timestamp: new Date().toUTCString(),
		type: type
	}

	if (currency) {
		const key1 = currency.toLowerCase() + '_to_btc';
		const conversionValue = conversions[key1];
		const key2 = 'btc_to_' + currency.toLowerCase();
		const BTCValue = conversions[key2];

		if (conversionValue === undefined) {
			console.log('No known exchange rate for BTC/' + currency + '. Order failed');
			return;
		}

		transaction.currency = currency.toUpperCase();
		transaction.convertedValue = conversionValue;
		transaction.BTCValue = BTCValue;
	}

	return transaction;
}

function getBTCConversions(callback) {
	request(URL, (err, res, body) => {
		if (!err && res.statusCode == 200) {
			const conversions = JSON.parse(body);

			callback(conversions);
		}
	});
}

function printTransaction(transaction) {
	if (transaction.currency) {
		console.log('Order to ' + transaction.type + ' ' + transaction.amount
			+ ' ' + transaction.currency + ' worth of BTC queued @ '
			+ transaction.BTCValue + ' BTC/' + transaction.currency
			+ ' (' + transaction.convertedValue + ' BTC)');
	} else {
		console.log('Order to ' + transaction.type + ' ' + transaction.amount
			+ ' BTC queued');
	}
}

const ordersQueue = [];

buy(20, 'usd');
buy(46);
buy('asdf');
buy(20, 'asdf');
buy(200, 'HKD');
