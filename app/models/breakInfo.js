"use strict";

class BreakInfo {
    constructor(textPre, from, to, textPost, icon) {
        this.textPre = textPre;
        this.from = from;
        this.to = to;
        this.textPost = textPost;
        this.icon = icon;
    }
}

module.exports = BreakInfo;
