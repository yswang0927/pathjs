/*!
 * 山哥(wangys0927@gmail.com) at:
 * 2015/08/25 -> 1.0 See README.md
 * 2015/01/16 -> 0.9 Use new route path parser, now it's powerful!	
 * 2015/01/04 -> 0.8.6 Upgrade route path parser.
 * 2014/12/31 -> 0.8.5 Supported legacy IE(6,7).			  
 */
;(function(root, factory) {
    if(typeof define === 'function' && define.amd) {
        define(function() {
          // Export Path even in AMD case in case this script is loaded with
          // others that may still expect a global Path.
          return (root.Path = factory(root));
        });
    } 
    // Next for Node.js or CommonJS.
    else if (typeof exports !== 'undefined') {
        //TODO 
        // factory(root, exports);
    } 
    // Finally, as a browser global.
    else {
        root.Path = factory(root);
    }

})(typeof window !== "undefined" ? window : this, function(root) {

    var isArray = function(arr) {
        return ('[object Array]' === Object.prototype.toString.call(arr));
    };
    var isFunction = function(fn) {
        return ('function' === typeof fn);
    };

    var Path = {
        'version': "1.0",

        'map': function (path) {
            var strPath = Path._pathToString(path);
            if(Path.routes.defined.hasOwnProperty(strPath)) {
                return Path.routes.defined[strPath];
            } else {
                return new Path.core.Route(path);
            }
        },
        'root': function (path) {
            Path.routes.root = Path._getHashPath(path);
        },
        'rescue': function (fn) {
            Path.routes.rescue = fn;
        },
        'to': function(path) {
            if(!path) return;
            path = Path._getHashPath(path);

            if(path == Path.routes.current) {
                var exitRoute = Path.match(Path.routes.current);
                if(!exitRoute) return;

                isFunction(exitRoute.do_exit) && exitRoute.do_exit.call(exitRoute);

                Path.routes.current = null;
                Path.routes.previous = null;
                Path.dispatch(path);
            } else {
                if(Path.history.supported) {
                    Path.history.pushState({}, document.title, path);
                } else {
                    window.location.hash = Path._fillHashPath(path);
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
            if(!passed_route) return;
            
            var previous_route, matched_route;
            if(Path.routes.current !== passed_route) {
                Path.routes.previous = Path.routes.current;
                Path.routes.current = passed_route;

                matched_route = Path.match(passed_route, true);

                if(Path.routes.previous) {
                    previous_route = Path.match(Path.routes.previous);
                    if(previous_route !== null && isFunction(previous_route.do_exit)) {
                        previous_route.do_exit.call(previous_route);
                    }
                }

                if(matched_route !== null) {
                    matched_route.run();
                    return true;
                } else {
                    if(Path.routes.rescue !== null) {
                        Path.routes.rescue();
                    }
                }
            }
        },
        'listen': function (options) {
            options = options || {};
            if(false === options.hashbang) {
                Path.routes.options.hashbang = false;
            }

            // hack legacy IE(6,7)
            Path._hackLegacyIE();

            var fn = function() {
                Path.dispatch(Path._getHashPath());
            };

            if(window.location.hash === '') {
                if(Path.routes.root !== null) {
                    window.location.hash = Path._fillHashPath(Path.routes.root);
                }
            }

            // The 'document.documentMode' checks below ensure that PathJS fires the right events
            // even in IE "Quirks Mode".
            if ("onhashchange" in window && (!document.documentMode || document.documentMode >= 8)) {
                window.onhashchange = fn;
            } else {
                setInterval(fn, 50);
            }

            if(window.location.hash !== '') {
                Path.dispatch(Path._getHashPath());
            }
        },
        'history': {
            'initial':{}, // Empty container for "Initial Popstate" checking variables.
            'pushState': function(state, title, path) {
                if(Path.history.supported){
                    if(Path.dispatch(path)){
                        window.history.pushState(state, title, path);
                    }
                } else {
                    if(Path.history.fallback){
                        window.location.hash = Path._fillHashPath(path);
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
            'listen': function(options) {
                options = options || {};
                Path.history.supported = !!(window.history && window.history.pushState);
                Path.history.fallback  = options.fallback;

                if(Path.history.supported){
                    Path.history.initial.popped = ('state' in window.history);
                    Path.history.initial.URL = window.location.href;
                    window.onpopstate = Path.history.popState;
                } else {
                    if(Path.history.fallback){
                        Path.listen(options);
                    }
                }
            }
        },
        'core': {
            'Route': function (path) {
                this.path = Path._pathToString(path);
                this.pathKeys = [];
                this.pathRegExp = [];

                if(isArray(path)) {
                    for(var i = 0; i < path.length; i++) {
                        this.pathRegExp.push(Path._pathRegExp(path[i], this.pathKeys, false, false));
                    }
                } else {
                    this.pathRegExp.push(Path._pathRegExp(path, this.pathKeys, false, false));
                }

                this.do_action = function(){};
                this.do_enter = [];
                this.do_exit = function(){};
                this.params = {};

                Path.routes.defined[this.path] = this;
            }
        },
        'routes': {
            'current': null,
            'root': null,
            'rescue': null,
            'previous': null,
            'options': {'hashbang': true},
            'defined': {}
        },
        '_getHashPath': function(path) {
            var _hash = path || window.location.hash;
            if(_hash.indexOf('#!') === 0) {
                _hash = _hash.slice(2);
            } else if('#' === _hash.charAt(0)) {
                _hash = _hash.slice(1);
            }

            var qsIndx = _hash.indexOf('?');
            if(qsIndx >= 0) {
                _hash = _hash.slice(0, qsIndx);
            }

            return _hash;
        },
        '_fillHashPath': function(path) {
            if('#' === path.charAt(0)) {
                return path;
            }
            return (Path.routes.options.hashbang ? '#!' : '#') + path;
        },
        // support complex path route
        '_pathToString': function(path) {
            if(isArray(path)) {
                return '[' + path.join(',') + ']';
            }
            return path.toString();
        },
        '_pathRegExp': function(path, keys, sensitive, strict) {
            if (Object.prototype.toString.call(path) === '[object RegExp]') {
                return path;
            } 

            if (isArray(path)) {
                path = '(' + path.join('|') + ')';
            }
            
            var _keys = [];
            path = path
                .concat(strict ? '' : '/?')
                // -- comment this to support path eg: /user/(\\d+)
                //.replace(/\/\(/g, '(?:/')
                .replace(/(\/)?(\.)?:(\w+)(?:(\(.*?\)))?(\?)?(\*)?/g, function(_, slash, format, key, capture, optional, star) {
                  
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
            if(isArray(keys) && _keys.length > 0) {
                var stack = [], group = [], paramIndexs = [];
                for(var i = 0, len = path.length; i < len; ++i) {
                    var c = path.charAt(i), 
                        _unescaped = (path.charAt(i-1) !== '\\');
                    
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
        '_decode': function(str) {
            try {
                return decodeURIComponent(str);
            } catch (e) {
                return str;
            }
        },
        // hack ie < 8
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

    Path.core.Route.prototype = {
        'to': function (fn) {
            this.do_action = fn;
            return this;
        },
        'enter': function (fns) {
            if(fns instanceof Array) {
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
        'run': function () {
            var halt_execution = false, _enterFn;
            if(this.do_enter.length > 0) {
                for(var i = 0; i < this.do_enter.length; i++) {
                    _enterFn = this.do_enter[i];
                    if(!_enterFn || !isFunction(_enterFn)) {
                        continue;
                    }

                    if(false === _enterFn.call(this)) {
                        halt_execution = true;
                        break;
                    }
                }
            }

            if(!halt_execution && isFunction(this.do_action)) {
                this.do_action.call(this);
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
        // match given url path
        'match': function(path, parameterize) {
            if(this.pathRegExp.length == 0) {
                return false;
            }

            for(var i = 0; i < this.pathRegExp.length; i++) {
                var m = this.pathRegExp[i].exec(path);
                if(m) {
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
            }

            return false;
        }
    };

    // Support no conflict
    // Map over Path in case of overwrite
    var previousPath = root.Path;
    Path.noConflict = function() {
        root.Path = previousPath;
        return Path;
    };

    return Path;
});