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
	const headers = Object.keys(ordersQueue[0]);
	const csv = json2csv({ data: ordersQueue, fields: headers });
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
		currency: 'BTC',
		rate: null,
		status: 'UNFILLED'
	}

	if (currency) {
		const key = 'btc_to_' + currency.toLowerCase();
		const rate = conversions[key];

		if (rate === undefined) {
			console.log('No known exchange rate for BTC/' + currency + '. Order failed.');
			return;
		}

		transaction.currency = currency.toUpperCase();
		transaction.rate = rate;
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
		const convertedValue = 1 / transaction.rate;
		console.log(toPrint + ' ' + transaction.currency + ' worth of BTC queued @ ' + transaction.rate + ' BTC/' + transaction.currency + ' (' + convertedValue + ' BTC)');
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
			if (isFirstRow) {
				isFirstRow = false;
				continue;
			}
			const timestamp = row[0];
			const action = row[1];
			const amount = row[2];
			const currency = row[3];
			const convertedValue = row[4];
			const rate = row[5];

			console.log(timestamp + ' : ' + action + ' ' + amount + currency + ' : UNFILLED');
		}
	});
	parser.on('error', (err) => {
		console.log(err.message);
	});
	fs.createReadStream(csvfile).pipe(parser);
}

