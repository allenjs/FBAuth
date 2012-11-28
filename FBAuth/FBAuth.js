(function () {
    "use strict";

    var FBAuth = WinJS.Namespace.define("FBAuth",
    {
        AuthClient: WinJS.Class.define(
            function (options) {
                var opts = ["appID", "secret", "storage", "extendTokenUrl"]
                for (var i = 0; i < opts.length; i++) {
                    var name = opts[i];
                    if (options[name])
                        this[name] = options[name];
                }
            },
        
            {
                authzInProgress: false,
                secret: undefined,
                appID: undefined,
                userName: undefined,
                user: undefined,
                token: undefined,
                extendTokenUrl: "https://graph.facebook.com/oauth/access_token?client_id=",
                storage: WinJS.Application.local,

                checksavedtoken: function()
                {
                    var session = this.storage;
                    var that = this;

                    return session.readText("fbauthtoken.txt", "").then(
                        function success(data) {
                            if (data.length > 0) {
                                return that.savetoken(data);
                            }
                            else return WinJS.Promise.wrapError("No saved token");
                        });
                },

                savetoken: function (token) {
                    var meUrl = "https://graph.facebook.com/me?access_token=" + token;
                    var that = this;

                    // verify the token before we save it
                    return WinJS.xhr({
                        url: meUrl
                    }).then(
                    function success(result) {
                        try {
                            that.user = JSON.parse(result.response);
                            that.userName = that.user.name;
                            that.token = token;

                            var session = that.storage;
                            return session.writeText("fbauthtoken.txt",token);

                        }
                        catch (e) {
                            that.user = undefined;
                            that.userName = undefined;
                            that.token = undefined;

                            return WinJS.Promise.wrapError(e);
                        }
                    });
                },

                logout: function () {
                    var session = this.storage;
                    session.remove("fbauthtoken.txt");

                    this.token = undefined;
                    this.user = undefined;
                    this.userName = undefined;
                    this.authzInProgress = false;
                },

                login: function() {
                    if (this.authzInProgress) {
                        // auth already in progress
                        return WinJS.Promise.wrapError("Auth already in progress");
                    }

                    var facebookURL = "https://www.facebook.com/dialog/oauth?client_id=";
                    var callbackURL = "https://www.facebook.com/connect/login_success.html";

                    facebookURL += this.appID + "&redirect_uri=" + encodeURIComponent(callbackURL) + "&scope=read_stream&display=popup&response_type=token";

                    var startURI = new Windows.Foundation.Uri(facebookURL);
                    var endURI = new Windows.Foundation.Uri(callbackURL);
                    this.authzInProgress = true;

                    var that = this;

                    return Windows.Security.Authentication.Web.WebAuthenticationBroker.authenticateAsync(
                        Windows.Security.Authentication.Web.WebAuthenticationOptions.none, startURI, endURI)
                        .then(function success(result) {

                            var responseURI = new Windows.Foundation.Uri(result.responseData);
                            var query = responseURI.queryParsed;
                            if (query.length > 0 && query.getFirstValueByName("error") != undefined) {
                                that.authzInProgress = false;
                                return WinJS.Promise.wrapError({
                                    message: "Login failed",
                                    query: query
                                });
                            }
                            var fragment = responseURI.fragment;
                            if (fragment.indexOf("#") == 0) {
                                // strip the leading #, so it can be treated like a query
                                fragment = fragment.substring(1, fragment.length - 1);
                            }
                            if (fragment.length < 4) {
                                that.authzInProgress = false;
                                return WinJS.Promise.wrapError("Login failed");
                            }

                            var decoder = new Windows.Foundation.WwwFormUrlDecoder(fragment);
                            var token = decoder.getFirstValueByName("access_token");
                            var expires = parseInt(decoder.getFirstValueByName("expires_in"));

                            if (token == undefined || expires == undefined) return WinJS.Promise.wrapError("Token or expires was undefined");

                            var expiresDate = new Date();
                            expiresDate.setTime(expiresDate.getTime() + 1000 * expires);
                            that.expires = expiresDate;

                            if (expires < 170000 && that.secret != undefined)
                                // want at least 2 days
                                return that.getExtendedToken(token);
                            else {
                                that.authzInProgress = false;
                                return that.savetoken(token);
                            }
                        });

                },

                getExtendedToken: function (token) {
                    var facebookURL = this.extendTokenUrl;

                    facebookURL += this.appID;
                    facebookURL += "&client_secret=" + this.secret + "&grant_type=fb_exchange_token&fb_exchange_token=" + token;

                    var that = this;

                    return WinJS.xhr({
                        type: "POST",
                        url: facebookURL
                    }).then(
                    function success(result) {
                        var fragment = result.responseText;
                        if (fragment.indexOf("#") == 0) {
                            // strip the leading #, so it can be treated like a query
                            fragment = fragment.substring(1, fragment.length - 1);
                        }
                        var decoder = new Windows.Foundation.WwwFormUrlDecoder(fragment);
                        var token = decoder.getFirstValueByName("access_token");
                        var expires = parseInt(decoder.getFirstValueByName("expires")); // not named expires_in anymore
                        var expiresDate = new Date();
                        expiresDate.setTime(expiresDate.getTime() + 1000 * expires);
                        that.expires = expiresDate;
                        that.authzInProgress = false;
                        return that.savetoken(token);

                    },
                    function error(e) {
                        // get extended failed, revert to the short token
                        that.authzInProgress = false;
                        return that.savetoken(token);
                    });
                }

            })

        });

})();