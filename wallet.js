#!/usr/bin/env node

const request = require('request');
const csv = require('csv');
const fs = require('fs');
const json2csv = require('json2csv');

const URL = 'https://coinbase.com/api/v1/currencies/exchange_rates';
const BUY = 'BUY';
const SELL = 'SELL';
const CSVFILE_DEFAULT = 'orders.csv';

const ordersQueue = [];

function buy(amount, currency) {
	initiateTransaction(amount, currency, BUY);
}

function sell(amount, currency) {
	initiateTransaction(amount, currency, SELL);
}

function orders() {
	if (ordersQueue.length === 0) {
		console.log('No orders found.');
		return;
	}
	
	const headers = Object.keys(ordersQueue[0]),
		csv = json2csv({ data: ordersQueue, fields: headers });
	fs.writeFileSync(CSVFILE_DEFAULT, csv);

	csv2console(CSVFILE_DEFAULT);
}

function initiateTransaction(amount, currency, action) {
	if (isNaN(amount) || amount <= 0) {
		console.log('No amount specified');
		return;
	}
	
	getBTCRates((conversions) => {
		const transaction = createTransaction(amount, currency, action, conversions);

		if (transaction) {
			ordersQueue.push(transaction);
			printTransaction(transaction);
		}
	});
}

function createTransaction(amount, currency, action, conversions) {
	const transaction = {
		timestamp: new Date().toString(),
		action: action,
		amount: amount,
		currency: null,
		rate: null,
		status: 'UNFILLED'
	}

	if (currency) {
		const key = 'btc_to_' + currency.toLowerCase(),
			rate = conversions[key];

		if (rate === undefined) {
			console.log('No known exchange rate for BTC/' + currency + '. Order failed.');
			return;
		}

		transaction.currency = currency.toUpperCase();
		transaction.rate = rate;
	} else {
		transaction.currency = 'BTC';
	}

	return transaction;
}

function getBTCRates(callback) {
	request(URL, (err, res, body) => {
		if (!err && res.statusCode == 200) {
			const conversions = JSON.parse(body);

			callback(conversions);
		}
	});
}

function printTransaction(transaction) {
	var toPrint = 'Order to ' + transaction.action + ' ' + transaction.amount;
	if (transaction.currency != 'BTC') {
		const currency = transaction.currency,
			rate = transaction.rate,
			convertedValue = 1 / transaction.rate;

		console.log(toPrint + ' ' + currency + ' worth of BTC queued @ ' + rate + ' BTC/' + currency + ' (' + convertedValue + ' BTC)');
	} else {
		console.log(toPrint + ' BTC queued');
	}
}

function csv2console(csvfile) {
	console.log('=== CURRENT ORDERS ===');
	const parser = csv.parse();
	var isFirstRow = true;
	parser.on('readable', () => {
		while (row = parser.read()) {
			// Skip header
			if (isFirstRow) {
				isFirstRow = false;
				continue;
			}
			const timestamp = row[0],
				action = row[1],
				amount = row[2],
				currency = row[3],
				convertedValue = row[4],
				rate = row[5];

			console.log(timestamp + ' : ' + action + ' ' + amount + currency + ' : UNFILLED');
		}
	});
	parser.on('error', (err) => {
		console.log(err.message);
	});
	fs.createReadStream(csvfile).pipe(parser);
}

