# Modified by 山哥(wangys0927@gmail.com) - from [Mtrpcic PathJS](https://github.com/mtrpcic/pathjs): #
* (V0.9) Add legacy IE(6,7) supported.
* (V0.9) Use new powerful route parser.
* (V1.0) Support AMD loader.
* (V1.0) The path does not need hash tag or hashbang tag prefix defined in `Path.map()`.
* (V1.0) Use hashbang tag default.
* (V1.0) Add method `Path.to(path)` to forward path.
* (V1.0) `Path.listen()` method add optional parameter: `{hashbang: true|false}`.
* (V1.0) `Path.history.listen()` method use new optional parameter: `{hashbang: true|false, fallback: true|false}`
* (V1.0.1) `this.params` supported parse QueryString parameters.

# PathJS #

PathJS is a lightweight, client-side routing library that allows you to create "single page" applications using Hashbangs and/or HTML5 pushState.

# Features #
* Lightweight
* Supports the HTML5 History API, the 'onhashchange' method, and graceful degredation
* Supports root routes, rescue methods, paramaterized routes, optional route components (dynamic routes), and Aspect Oriented Programming
* Well Tested (tests available in the `./tests` directory)
* Compatible with all major browsers (Firefox 3+, Chrome 9+, Opera 11+, IE6+)
* Independant of all third party libraries, but plays nice with all of them

# Using PathJS - A Brief Example #

    function clearPanel(){
        // You can put some code in here to do fancy DOM transitions, such as fade-out or slide-in.
    }
    
    Path.map("/users").to(function(){
        alert("Users!");
    });
    
    Path.map("/comments").to(function(){
        alert("Comments!");
    }).enter(clearPanel);
    
    Path.map("/posts").to(function(){
        alert("Posts!");
    }).enter(clearPanel);
    
    Path.root("/posts");
    
    Path.listen();

# Document and Examples #
## Getting Started
The hashtag("#") is the original method of using PathJS. It is compatible with all modern browsers, and even some that are not-so-modern. To get started, all you need to do is define a route. A route can be any string prepended with a hash, such as:

    #/my/first/route
    #!/hashbang
    #kittens

## Binding Routes
PathJS provides the Path object. This is the root of the library, and is your gateway into route-defining heaven. You can define your routes like so:

    // Use an anonymous function
    Path.map("/my/first/route").to(function(){
        alert("Hello, World!");
    });

    // Or define one and use it
    function hello_world(){
        alert("Hello, World!");
    }
    Path.map("/kittens").to(hello_world);

## Aspect Oriented Programming
In addition to defining methods that will be executed when a route is activated, you can define methods that will be called before a route is activated, and after a route is left. This can be done via the enter and exit methods, respectively. They work exactly the same as the to method:

    //Let's add an 'enter' method to one of our routes
    Path.map("/my/first/route").enter(function(){
        alert("Enter, minions!");
    });

    // You can also chain the methods together
    Path.map("/hashbang/route").enter(fade_in).to(function(){
        alert("Method chaining is great!");
    }).exit(fade_out);


## Before Filters and Execution Halting
In some cases, you may want to perform multiple actions before an action is taken, and depending on their results, cancel the action altogether. For this reason, PathJS supports multiple 'enter' actions, which can be assigned individually or as an array:

    Path.map("/my/first/route").enter(function(){
        alert("First one!");
    }).enter([
        function(){
            alert("Second!");
            return false;
        },
        function(){
            alert("And third!");
        }
    ]);

    Path.map("/my/first/route").to(function(){
        alert("Action!")
    });

The methods are executed first-in-first-out, and if any of them returns false, the execution chain is immediately halted. In the example above, the third 'enter' method, as well as the actual action, will never get called, because the second one explicitly returns false.

## Route Parameters
What good would a routing system be if it didn't allow you to use parameters? If you provide a route that contains a :token, that token will match anything, as long as the rest of the route matches as well. You can access the parameters inside your methods via the this.params object:

    Path.map("/users/:name").to(function(){
        alert("Username: " + this.params['name']);
    });

The above route will match any of the following hrefs:

    #!/users/mike
    #!/users/27

## Optional/Dynamic Routes
You can define a route that has optional components by wrapping the non-mandatory components in parentheses. Inside your bound method(s), any params that were not provided will come back as undefined.

    Path.map("/users/:user_id?").to(function(){
        var user_id = this.params["user_id"] || "Set a default here!";
    });

The above route will match both of the following:

    #!/users    // Your "user_id" parameter will be undefined.
    #!/users/7  // Your "user_id" parameter will be set to "7".

## All supported Route rules

    /users                 // Static rule: Path.map('/users')
                              //
    /users/:id             // Named route parameter: Path.map('/users/:id') 
                              // --> this.params['id']
    /users/:id(\\d+)       // Parameter muse be digits: Path.map('/users/:id(\\d+)')
                              // --> this.params['id']
    /users/:id?            // Parameter is optional: Path.map('/users/:id?') 
                              // --> this.params['id'] || 'undefined'
    /users/:id/:action     // Path.map('/users/:id/:action')
                              // --> this.params['id'], this.params['action']
    /users/(\\d+)          // Regexp route parameter: Path.map('/users/(\\d+)')
                              // --> this.params[0]
    /users/(\\d+)/(\\w+)   // Path.map('/users/(\\d+)/(\\w+)')
                              // --> this.params[0], this.params[1]
    /users/:id/(\\w+)      // Named parameter and regexp parameter mixed use: Path.map('/users/:id/(\\w+)')
                              // --> this.params['id'], this.params[0]
    /users/*               // Wildcard parameter: Path.map('/users/*') 
                              // --> this.params[0] || 'undefined'
    ['/A', '/B', '/C']     // Array multi route, can matched any one given: Path.map(['/A', '/B', '/C'])
                              //
    /^#\/comments\/(\d+)$/ // Regexp route: Path.map(/^#\/comments\/(\d+)$/)
                              //

    Other:
    /users_:id_:action                 // /users_2_edit
    /get.:id..comments\\?p=:page(\\d+) // get.1202..comments?page=1
    /... as define yourself...                    
    

## Root Route
If a user were to land on your page without a route defined, you can force them to use a root route. This route will be automatically selected on page load:

    Path.root("/home");

## Rescue Method
If a route somehow ended up in your system without being properly bound to an action, you can specify a "rescue" method that will be called. This lets you provide instant user feedback if they click an undefined route:

    Path.rescue(function(){
        alert("404: Route Not Found");
    });

## Automatic Dispatching
If a user gets to your page with an already defined route (for example, the click a referral link with the href of "www.yoursite.com/media#download"), PathJS will automatically find and execute the appropriate route methods.

## Listen Carefully
You can define routes all day long, but if you don't tell us to listen for them, nothing's going to happen. Once you've got your routes defined, start the listener up by simply typing:

    Path.listen({hashbang:true|false});

You should always wrap your `Path.listen()` statements in some form of "Document Ready" method. This prevents errors when users come to your site with a predefined route. Without knowing the DOM is completely done loading, that route will be executed, and may try to perform operations it won't yet have the ability to do.

## HTML5 PushState
As of version 0.7, PathJS officially supports the HTML5 History API via pushState. Before reading this page, please make sure you've read the wiki page about Getting Started. The HTML5 History API is only supported by some modern browsers.

### Differences with the Hashtag
- There is no support for root routes or default routes, as these don't make sense when the URI contains no special characters. Simply pass the full route around.
- Rather than calling the `Path.listen()` method, you now call the `Path.history.listen()` method
- To trigger an event, call the `Path.history.pushState` method, rather than the `history.pushState` method.

### Defining Routes
You define the routes the same as usual, except you omit the Hashtag from your route:

    Path.map("/html5/rocks").to(function(){
        alert("Hello, World!");
    });

### Executing Routes
Much like the regular HTML5 History API, to add a new history item to the global history object, you need to call the `pushState` method. When you want to use the PathJS Route Dispatcher, you need to call the PathJS pushState method.

    Path.history.pushState(state, title, path);

The `Path.history.pushState` method is analogous to the standard `history.pushState` method, but wraps calls to the PathJS dispatcher. You can access the history state information the same as if you had manually set the state via `history.pushState`.

### Listen Carefully & Graceful Degredation
As mentioned above, you now need to call the `Path.history.listen()` method instead of the standard `Path.listen()` method. Unlike the standard `Path.listen()` method, this method accepts a single boolean parameter, which tells the PathJS library whether or not it should fallback to hashtag support if HTML5 is not supported.

    Path.history.listen({'hashbang': true|false, 'fallback': true});  // Yes, please fall back to hashtags if HTML5 is not supported.
    Path.history.listen({'fallback': false}); // No, do not fall back to hashtags.
    Path.history.listen();      // This is the same as passing "false".

This new method does several things:

1. Checks to see if HTML5 is supported, and sets the `Path.history.supported` attribute accordingly
2. Assigns internal methods to the window.onpopstate attribute to provide 'back' capabilities
3. Checks, depending on the fallback parameter, whether or not to invoke the hashtag listener and to modify your defined routes to support hashtags.

### Notes
- The `Path.history.listen()` method will wrap a call to `Path.listen()` if you want gracefull degredation to Hashtags. There is no need for you to call it yourself in this case.
- PathJS only provides wrappers for the HTML5 History API, and as such, the HTML5 support is only available in modern browsers that support the HTML5 History API.


# Running Tests #
To run the tests, simply navigate to the `./tests` folder and open the HTML file in your browser.  Please note that the HTML5 History API is not compatible with the
`file://` protocol, and to run the tests in the `tests/pushstate` folder, you will need to run them through a webserver such as nginx or Apache.

# Next Steps #
* Adding support for "after" callbacks
* Deprecating the "enter" callback in favour of "before"

# Pull Requests #
To make a pull request, please do the following:

* Mention what specific version of PathJS you were using when you encountered the issue/added the feature.  This can be accessed by doing `Path.version` in a debugger console
* Make sure you update the test suite with your changes.  **All tests must pass**
* Make sure to update the minified version of the source
* Do **not** modify the `Path.version` attribute.  I will modify that manually when merging the request

# Disclaimer #
This code is provided with no warranty.  While I strive to maintain backwards compatibility, the code is still under active development.  As this is the case, some revisions may break break compatibility with earlier versions of the library.  Please keep this in mind when using PathJS.

# Copyright and Licensing #
Copyright (c) 2015 Wangyongshan, Mike Trpcic released under the MIT license.