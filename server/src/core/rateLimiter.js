/**
	* Tracks frequency of occurances based on `id` (remote address), then allows or
	* denies command execution based on comparison with `threshold`
	*
	* Version: v2.0.0
	* Developer: Marzavec ( https://github.com/marzavec )
	* License: WTFPL ( http://www.wtfpl.net/txt/copying/ )
	*
	*/

'use strict';

class Police {
	/**
	 * Create a ratelimiter instance.
	 */
	constructor () {
		this._records = {};
		this._halflife = 30000; // ms
		this._threshold = 25;
	}

	/**
		* Finds current score by `id`
		*
		* @param {String} id target id / address
		* @public
		*
		* @memberof Police
		*/
	search (id) {
		let record = this._records[id];

		if (!record) {
			record = this._records[id] = {
				time: Date.now(),
				score: 0
			}
		}

		return record;
	}

	/**
		* Adjusts the current ratelimit score by `deltaScore`
		*
		* @param {String} id target id / address
		* @param {Number} deltaScore amount to adjust current score by
		* @public
		*
		* @memberof Police
		*/
	frisk (id, deltaScore) {
		let record = this.search(id);

		if (record.arrested) {
			return true;
		}

		record.score *= Math.pow(2, -(Date.now() - record.time ) / this._halflife);
		record.score += deltaScore;
		record.time = Date.now();

		if (record.score >= this._threshold) {
			return true;
		}

		return false;
	}

	/**
		* Statically set server to no longer accept traffic from `id`
		*
		* @param {String} id target id / address
		* @public
		*
		* @memberof Police
		*/
	arrest (id) {
		var record = this.search(id);

		if (record) {
			record.arrested = true;
		}
	}

	/**
		* Remove statically assigned limit from `id`
		*
		* @param {String} id target id / address
		* @public
		*
		* @memberof Police
		*/
	pardon (id) {
		var record = this.search(id);

		if (record) {
			record.arrested = false;
		}
	}
}

module.exports = Police;
