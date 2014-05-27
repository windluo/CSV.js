(function() {
  'use strict';

  var CSV = function(options) {
    var exists = function(possible) { return !!(possible && possible !== null); };

    options = exists(options) ? options : {};

    this.options = {
      delimiter: exists(options.delimiter) ? options.delimiter : ",",
      header: exists(options.header) ? options.header : false,
      stream: exists(options.stream) ? options.stream : undefined,
      done: exists(options.done) ? options.done : undefined
    };

    return this;
  };

  CSV.format = {
    cast: function(string) {
      string = string.toLowerCase().trim();
      if (string === "") {
        return undefined;
      }  else if(!isNaN(Number(string))) {
        return Number(string);
      } else if (string === "true" || string === "t" || string === "yes" || string === "y") {
        return true;
      } else if (string === "false" || string === "f" || string === "no" || string === "n") {
        return false;
      }
    },
    stringify: function(string) {
      return !isNaN(Number(string)) ? string : '"' + string.replace(/\"/, '""') + '"';
    },
    encode: function(array) {
      return array.map(CSV.format.stringify).join(",") + "\r\n";
    }
  };

  CSV.prototype.set = function(option, value) {
    this.options[option] = value;
    return this.options;
  };

  CSV.prototype.encode = function(data) {
    var response, kind, fields, header, stream, complete;
    response = [];
    kind = data[0] instanceof Array ? "array" : "object";
    header = this.options.header;
    stream = this.options.stream || [].push;
    complete = this.options.done;

    if (kind === "object") {
      fields = Object.keys(data[0]);
      stream.call(response, CSV.format.encode(fields));
      data.forEach(function(record) {
        record = fields.map(function(key) { return record[key]; });
        stream.call(response, CSV.format.encode(record));
      });
    } else {
      if (header && header instanceof Array) stream.call(response, CSV.format.encode(header));
      data.forEach(function(record) { stream.call(response, CSV.format.encode(record)); });
    }

    // Return as appropriate
    return complete ? complete(response) : response.join("");
  };

  CSV.prototype.parse = function(text) {
    var response, stream, complete, header, fields, current, flag, save, send;
    // Response
    response = [];
    // Aliases
    stream = this.options.stream || [].push;
    complete = this.options.done;
    header = this.options.header;
    fields = header instanceof Array ? header : [];

    current = { row: [], cell: "" };
    flag = { escaped: false, quote: false, cell: true };

    save = function(cell) {
      if (flag.escaped) cell = cell.slice(1, -1).replace(/""/g, '"');

      current.row.push(CSV.format.cast(cell));
      current.cell = "";
      flag = { escaped: false, quote: false, cell: true };
    };

    send = function() {
      if (fields && fields.length) {
        var object = {};
        for (var _n = 0, _lenf = fields.length; _n < _lenf; ++_n) object[fields[_n]] = current.row[_n];
        stream.call(response, object);
      } else if (header) {
        fields = header instanceof Array ? header : current.row;
      } else {
        stream.call(response, current.row);
      }
      current.row = [];
    };

    for (var start = 0, _i = 0, _lent = text.length, _delim = this.options.delimiter.charCodeAt(0), sign; _i <= _lent; ++_i) {
      sign = text.charCodeAt(_i);
      if (flag.cell) {
        flag.cell = false;
        if (sign === 34) {
          flag.escaped = true;
          continue;
        }
      }
      if (flag.escaped) {
        if (sign === 34) {
          flag.quote = !flag.quote;
          continue;
        }
      }
      if ((flag.escaped && flag.quote) || !flag.escaped) {
        if (sign === _delim) {
          save(current.cell + text.slice(start, _i));
          start = _i + 1;
        } else if (sign === 10 || _i === _lent) {
          save((current.cell + text.slice(start, _i)).slice(0, -1));
          start = _i + 1;
          send();
        }
      }
    }

    // Return as appropriate
    return complete ? complete(response) : response;
  };

  // Define this module
  if (typeof define === "function" && define.amd) {
    define(CSV);
  } else if (typeof module === "object" && module.exports) {
    module.exports = CSV;
  } else {
    window.CSV = CSV;
  }

})();