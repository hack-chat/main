/**
	* Simple generic stats collection script for events occurances (etc)
	*
	* Version: v2.0.0
	* Developer: Marzavec ( https://github.com/marzavec )
	* License: WTFPL ( http://www.wtfpl.net/txt/copying/ )
	*
	*/

'use strict';

class Stats {
	/**
		* Create a stats instance.
		*
		*/
	constructor () {
		this._stats = {};
	}

	/**
		* Retrieve value of arbitrary `key` reference
		*
		* @param {String} key Reference to the arbitrary store name
		*/
	get (key) {
		return this._stats[key];
	}

	/**
		* Set value of arbitrary `key` reference
		*
		* @param {String} key Reference to the arbitrary store name
		* @param {Number} value New value for `key`
		*/
	set (key, value) {
		this._stats[key] = value;
	}

	/**
		* Increase value of arbitrary `key` reference, by 1 or `amount`
		*
		* @param {String} key Reference to the arbitrary store name
		* @param {Number} amount Value to increase `key` by, or 1 if omitted
		*/
	increment (key, amount) {
		this.set(key, (this.get(key) || 0) + (amount || 1));
	}

	/**
		* Reduce value of arbitrary `key` reference, by 1 or `amount`
		*
		* @param {String} key Reference to the arbitrary store name
		* @param {Number} amount Value to decrease `key` by, or 1 if omitted
		*/
	decrement (key, amount) {
		this.set(key, (this.get(key) || 0) - (amount || 1));
	}
}

module.exports = Stats;
