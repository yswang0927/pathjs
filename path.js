/*!
 * modify by yswang at:
 * 2014/12/31 -> 0.8.5 supported IE6,7
 * 2015/01/04 -> 0.8.6 upgrade route path parsor
 */
;(function(window) {
    var Path = {
        'version': "0.8.6",
        'map': function (path) {
            var str_path = Path._pathToString(path);
            if(Path.routes.defined.hasOwnProperty(str_path)) {
                return Path.routes.defined[str_path];
            } else {
                return new Path.core.route(path);
            }
        },
        'root': function (path) {
            Path.routes.root = path;
        },
        'rescue': function (fn) {
            Path.routes.rescue = fn;
        },
        'history': {
            'initial':{}, // Empty container for "Initial Popstate" checking variables.
            'pushState': function(state, title, path){
                if(Path.history.supported){
                    if(Path.dispatch(path)){
                        window.history.pushState(state, title, path);
                    }
                } else {
                    if(Path.history.fallback){
                        window.location.hash = "#" + path;
                    }
                }
            },
            'popState': function(event){
                var initialPop = !Path.history.initial.popped && window.location.href == Path.history.initial.URL;
                Path.history.initial.popped = true;
                if(initialPop) { 
                    return; 
                }
                
                Path.dispatch(document.location.pathname);
            },
            'listen': function(fallback){
                Path.history.supported = !!(window.history && window.history.pushState);
                Path.history.fallback  = fallback;

                if(Path.history.supported){
                    Path.history.initial.popped = ('state' in window.history);
                    Path.history.initial.URL = window.location.href;
                    window.onpopstate = Path.history.popState;
                } else {
                    if(Path.history.fallback){
                        for(route in Path.routes.defined){
                            if(route.charAt(0) != "#"){
                              Path.routes.defined["#"+route] = Path.routes.defined[route];
                              Path.routes.defined["#"+route].path = "#"+route;
                            }
                        }
                        Path.listen();
                    }
                }
            }
        },
        'match': function (path, parameterize) {
            var route = null;
            for (var _dpath in Path.routes.defined) {
                route = Path.routes.defined[_dpath];
                if(route && route.match(path, parameterize)) {
                    return route;
                } 
            }
            return null;
        },
        'dispatch': function (passed_route) {
            var previous_route, matched_route;
            if (Path.routes.current !== passed_route) {
                Path.routes.previous = Path.routes.current;
                Path.routes.current = passed_route;

                matched_route = Path.match(passed_route, true);

                if (Path.routes.previous) {
                    previous_route = Path.match(Path.routes.previous);
                    if (previous_route !== null && typeof previous_route.do_exit === 'function') {
                        previous_route.do_exit();
                    }
                }

                if (matched_route !== null) {
                    matched_route.run();
                    return true;
                } else {
                    if (Path.routes.rescue !== null) {
                        Path.routes.rescue();
                    }
                }
            }
        },
        'listen': function () {
            // yswang add to hack legacy IE(6,7)
            Path._hackLegacyIE();

            var fn = function() {Path.dispatch(window.location.hash);};

            if(window.location.hash === "") {
                if (Path.routes.root !== null) {
                    window.location.hash = Path.routes.root;
                }
            }

            // The 'document.documentMode' checks below ensure that PathJS fires the right events
            // even in IE "Quirks Mode".
            if ("onhashchange" in window && (!document.documentMode || document.documentMode >= 8)) {
                window.onhashchange = fn;
            } else {
                setInterval(fn, 50);
            }

            if(window.location.hash !== "") {
                Path.dispatch(window.location.hash);
            }
        },
        'core': {
            'route': function (path) {
                this.path = Path._pathToString(path);
                // yswang
                this.pathKeys = [];
                this.pathRegExp = Path._pathRegExp(path, this.pathKeys, false, false);

                this.action = null;
                this.do_enter = [];
                this.do_exit = null;
                this.params = {};

                Path.routes.defined[Path._pathToString(path)] = this;
            }
        },
        'routes': {
            'current': null,
            'root': null,
            'rescue': null,
            'previous': null,
            'defined': {}
        },

        // yswang add to support complex path route
        '_pathToString': function(path) {
            if(Object.prototype.toString.call(path) === '[object Array]') {
                return '[' + path.join(',') + ']';
            }
             
            return path.toString();
        },
        '_pathRegExp': function(path, keys, sensitive, strict) {
            if (Object.prototype.toString.call(path) === '[object RegExp]') {
                return path;
            } 

            if (Object.prototype.toString.call(path) === '[object Array]') {
                path = '(' + path.join('|') + ')';
            }
            
            var _keys = [];
            path = path
                .concat(strict ? '' : '/?')
                // -- comment this to support path eg: /user/(\\d+)
                //.replace(/\/\(/g, '(?:/')
                .replace(/(\/)?(\.)?:(\w+)(?:(\(.*?\)))?(\?)?(\*)?/g, function(_, slash, format, key, capture, optional, star){
                  
									_keys.push({'name': key, 'optional': !! optional});

                  slash = slash || '';
                 
                  return ''
                        + (optional ? '' : slash)
                        + '(?:'
                        + (optional ? slash : '')
                        + (format || '') + (capture || (format && '([^/.]+?)' || '([^/]+?)')) + ')'
                        + (optional || '')
                        + (star ? '(/*)?' : '');
                })
                .replace(/([\/.])/g, '\\$1')
                .replace(/\*/g, '(.*)');

            // ----- important：reset index position of saved keys -----
            if(Object.prototype.toString.call(keys) === '[object Array]' && _keys.length > 0) {
                var stack = [], group = [], paramIndexs = [];
                for(var i = 0, len = path.length; i < len; ++i) {
                    var c = path.charAt(i), 
                        _unescaped = path.charAt(i-1) !== '\\';
                    
                    if(c === '(' && _unescaped) {
                        stack.push(c);
                        group.push(c);
                    }
                    else if(c === ')' && _unescaped) {
                        stack.pop();
                        group.push(c);
                        
                        // regexp group match end
                        if(stack.length == 0) {
                            paramIndexs.push(group.join('').indexOf('?:') != -1 ? 1 : 0);
                            group = [];
                        }
                    }
                    else if(stack.length > 0) {
                        group.push(c);
                    }
                }
                
                // exist unmatched regexp group
                if(stack.length > 0) {
                    throw new Error('The Path regexp <'+ path +'> has unmatched group!');
                }
                
                // reset keys index
                var namedKeys = _keys.slice(0), c = 0;
                for(var j = 0, len = paramIndexs.length; j < len; ++j) {
                    keys.push((paramIndexs[j] == 1 && c < namedKeys.length) ? namedKeys[c++] : false);
                }
            }

            return new RegExp('^' + path + '$', sensitive ? '' : 'i');
        },
        // yswang add
        '_decode': function(str) {
            try {
                return decodeURIComponent(str);
            } catch (e) {
                return str;
            }
        },
        // yswang add hack ie < 8
        '_ieFrame': null, //iframe used for legacy IE (6-7)
        '_hackLegacyIE': function() {
            if(Path._ieFrame) {
                return;
            }

            //check if is IE6-7 since hash change is only supported on IE8+ and
            //changing hash value on IE6-7 doesn't generate history record.
            // (!+"\v1") -- check is ie
            var _isLegacyIE = (!+"\v1") && !("onhashchange" in window && (!document.documentMode || document.documentMode >= 8));
            if(!_isLegacyIE) {
                return;
            }

            var _ieFrame = document.createElement('iframe');
                _ieFrame.src = 'about:blank';
                _ieFrame.style.display = 'none';
                _ieFrame.setAttribute('tabindex', '-1');
                _ieFrame.attachEvent('onload', function() {
                    if(Path._ieFrame.frameHash && Path._ieFrame.frameHash != window.location.hash) {
                        window.location.hash = Path._ieFrame.frameHash;
                    }
                });

            document.body.appendChild(_ieFrame);

            Path._ieFrame = _ieFrame.contentWindow;
            _ieFrame = null;
        }
    };

    Path.core.route.prototype = {
        'to': function (fn) {
            this.action = fn;
            return this;
        },
        'enter': function (fns) {
            if (fns instanceof Array) {
                this.do_enter = this.do_enter.concat(fns);
            } else {
                this.do_enter.push(fns);
            }
            return this;
        },
        'exit': function (fn) {
            this.do_exit = fn;
            return this;
        },
        'partition': function () {
            var parts = [], options = [], re = /\(([^}]+?)\)/g, text, i;
            while (text = re.exec(this.path)) {
                parts.push(text[1]);
            }
            options.push(this.path.split("(")[0]);
            for (i = 0; i < parts.length; i++) {
                options.push(options[options.length - 1] + parts[i]);
            }
            return options;
        },
        'run': function () {
            var halt_execution = false, i, result, previous;
            if (Path.routes.defined[this.path].hasOwnProperty("do_enter")) {
                if (Path.routes.defined[this.path].do_enter.length > 0) {
                    for (i = 0; i < Path.routes.defined[this.path].do_enter.length; i++) {
                        result = Path.routes.defined[this.path].do_enter[i].call(this);
                        if (result === false) {
                            halt_execution = true;
                            break;
                        }
                    }
                }
            }

            if (!halt_execution) {
                Path.routes.defined[this.path].action();
            }

            // supported legacy IE(6,7)
            if(Path._ieFrame) {
                var _hash = window.location.hash;
                if(_hash != Path._ieFrame.frameHash) {
                    _hash = _hash.replace(/"/g, '\\"');
                    var frameDoc = Path._ieFrame.document;
                    frameDoc.open();
                    //update iframe content to force new history record.
                    frameDoc.write('<html><head><title>' + document.title + '</title><script type="text/javascript">var frameHash="' + _hash + '";</script></head><body>&nbsp;</body></html>');
                    frameDoc.close();
                }
            }
        },
        // yswang add route match given url path
        'match': function(path, parameterize) {
            var m = this.pathRegExp.exec(path);
            if(!m) {
                return false;
            } 

            if(parameterize) {
                var keys = this.pathKeys, keysSize = keys.length, key, val, params = [];
                for(var i = 1, len = m.length; i < len; ++i) {
                    key = keysSize >= i ? keys[i-1] : null;
                    val = 'string' == typeof m[i] ? Path._decode(m[i]) : m[i];
                    
                    if(key && key.name) {
                      params[key.name] = val;
                    } else {
                      params.push(val);
                    }
                }

                this.params = params;
            }

            return true;
        }
    };

    !this.Path && (this.Path = Path);

})(window);
