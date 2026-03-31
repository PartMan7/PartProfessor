class CR {
	constructor(height, width, room, beeg) {
		this.room = room;
		if (!width || !height) {
			width = 6;
			height = 9;
		}
		this.height = height;
		this.width = width;
		this.beeg = beeg;
		this.board = Array.from(Array(height).keys()).map((x) =>
			Array.from(Array(width).keys()).map((y) => ({
				value: 0,
				crit: Array.from([
					x,
					y,
					height - x - 1,
					width - y - 1,
				]).filter((n) => n).length,
				col: 0,
				coords: [x, y],
			})),
		);
		this.colours = {};
		this.players = {};
		this.started = false;
		this.order = [];
		this.PL = [];
		this.turn = null;
		if (beeg)
			this.availableColours = [
				"#e6194b",
				"#3cb44b",
				"#ffe119",
				"#4363d8",
				"#f58231",
				"#911eb4",
				"#42d4f4",
				"#f032e6",
				"#bfef45",
				"#fabed4",
				"#dcbeff",
				"#fffac8",
				"#aaffc3",
				"#ffffff",
				"#a9a9a9",
			].shuffle();
		else
			this.availableColours = [
				"#ff0000",
				"#ff8000",
				"#ffff00",
				"#00ff00",
				"#00ffff",
				"#0000ff",
				"#9e00ff",
				"#ff00ff",
			].shuffle();
		this.displaying = false;
	}
	addPlayer(name) {
		const user = toID(name),
			colour = this.availableColours.pop();
		if (!colour) return null;
		if (this.players[user]) return;
		this.players[user] = {
			name: name,
			col: colour,
			played: false,
		};
		this.colours[colour] = user;
		this.order.push(user);
		this.PL.push(user);
		return true;
	}
	removePlayer(name) {
		const user = toID(name);
		if (!this.players[user]) return;
		this.availableColours.push(this.players[user].col);
		this.order.remove(user);
		this.PL.remove(user);
		delete this.colours[this.players[user].col];
		delete this.players[user];
		return true;
	}
	start() {
		if (this.started) return;
		this.started = true;
		this.order.shuffle();
		Bot.say(this.room, `The game of Chain Reaction is starting!`);
		this.turn = this.order[this.order.length - 1];
		return this.nextTurn();
	}
	nextTurn() {
		if (!this.started || !this.turn || !this.order.includes(this.turn))
			return;
		const allO = Array.from(this.order);
		if (this.turn === this.order[this.order.length - 1])
			this.turn = this.order[0];
		else this.turn = this.order[this.order.indexOf(this.turn) + 1];
		this.order = this.order.filter((player) => this.isAlive(player));
		if (this.order.length < 2) return this.order[0];
		while (!this.order.includes(this.turn)) {
			if (this.turn === allO[allO.length - 1]) this.turn = allO[0];
			else this.turn = allO[allO.indexOf(this.turn) + 1];
		}
		Bot.say(this.room, `/adduhtml CR, ${this.display()}`);
		return Bot.say(
			this.room,
			`/notifyuser ${this.turn}, Chain Reaction, Your turn!`,
		);
	}
	isAlive(player) {
		const user = toID(player);
		if (!this.players[user]) return false;
		if (!this.players[user].played) return true;
		const col = this.players[user].col;
		for (let i = 0; i < this.height; i++)
			for (let j = 0; j < this.width; j++) {
				if (
					this.board[i][j].value &&
					this.board[i][j].col === col
				)
					return true;
			}
		return false;
	}
	willExplode(board) {
		if (!board) board = this.board;
		for (let i = 0; i < this.height; i++)
			for (let j = 0; j < this.width; j++) {
				if (board[i][j].value >= board[i][j].crit) return true;
			}
		return false;
	}
	detonate(board) {
		if (!board) board = this.board;
		const clone = JSON.parse(JSON.stringify(board));
		if (!this.willExplode(clone)) return;
		for (let i = 0; i < this.height; i++)
			for (let j = 0; j < this.width; j++) {
				if (clone[i][j].value >= clone[i][j].crit) {
					board[i][j].value -= board[i][j].crit;
					[
						[i + 1, j],
						[i - 1, j],
						[i, j + 1],
						[i, j - 1],
					]
						.filter((cell) => {
							return (
								cell[0] >= 0 &&
								cell[0] < this.height &&
								cell[1] >= 0 &&
								cell[1] < this.width
							);
						})
						.forEach((cell) => {
							board[cell[0]][cell[1]].value++;
							board[cell[0]][cell[1]].col =
								board[i][j].col;
						});
					if (!board[i][j].value) board[i][j].col = 0;
				}
			}
		return this.willExplode();
	}
	tap(x, y, col) {
		if (
			x >= this.height ||
			x < 0 ||
			y >= this.width ||
			y < 0 ||
			!this.colours[col]
		)
			return;
		if (this.board[x][y].value && this.board[x][y].col !== col) return;
		this.players[this.colours[col]].played = true;
		const out = [];
		if (!this.board[x][y].value) this.board[x][y].col = col;
		this.board[x][y].value++;
		out.push(this.display());
		while (
			this.willExplode() &&
			this.order.filter((player) => this.isAlive(player)).length > 1
		) {
			this.detonate(Array.from(this.board));
			out.push(this.display(true));
		}
		return [...out, this.display()];
	}
	display(filler) {
		const renderValueAsText = (value) =>
			Bot.AFD
				? [
						null,
						"一",
						"二",
						"三",
						"四",
						"五",
						"六",
						"七",
						"八",
						"九",
					][value]
				: value;
		// eslint-disable-next-line max-len
		let html =
			'<div style="background-color: black;"><center><table style="border-collapse:collapse;border-spacing:0;border-color:#aaa;" border="1">';
		const a = "25";
		for (let i = 0; i < this.height; i++) {
			html += `<tr>`;
			for (let j = 0; j < this.width; j++) {
				// eslint-disable-next-line max-len
				html += `<td width="${a}" height="${a}" style="text-align:center;">${filler ? "" : `<b><button name="send" value="/msgroom ${this.room},/botmsg ${Bot.status.nickName}, ${prefix}chainreaction ${this.room} click ${i} ${j}" style="background:none;border:none;width:100%;height:100%;"${this.board[i][j].col ? ` title="${tools.escapeHTML(this.players[this.colours[this.board[i][j].col]].name)}"` : ""}>`}<span style="color:${this.board[i][j].col};font-family:Verdana;">${renderValueAsText(this.board[i][j].value) || " "}</span>${filler ? "" : "</button></b>"}</td>`;
			}
			html += "</tr>";
		}
		// eslint-disable-next-line max-len
		html += `</table></center></div><br>Current turn: <font color="${this.players[this.turn].col}">@</font>${tools.escapeHTML(this.players[this.turn].name)}`;
		return html;
	}
}

module.exports = CR;
