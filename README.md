# FBAuth.js

Sample Code for Authenticating to Facebook from a WinJS Client App

## Using

Pass your settings to the constructor.  At a minimum, you need to supply your App ID copied from the [Facebook Developer Portal](https://developers.facebook.com/apps).

                var appID = "991523450923444";

                var auth = new FBAuth.AuthClient(
                    {
                        appID: appID
                    });

Then, you can check to see if the user has already logged in:

                auth.checksavedtoken().then(
                    function success(data) {
                        // user has a valid token in auth.token
                        document.getElementById("user").innerText = auth.user.name;
                    },
                    function error(e) {
                        // no valid token saved, user not logged in
                    });

When any call to `checksavedtoken()` or `login()` is successful, the `user` property (`auth.user`) is populated with a [Facebook User](https://developers.facebook.com/docs/reference/api/user/) object representing the currently logged-on user.  
On success, the `token` property contains the token that you can pass in to Graph API calls.  If the call to `checksavedtoken()` or `login()` fails, `user` and `token` are undefined.  In the example above, we are getting the user name.

You can invoke a login like this:

                document.getElementById("signIn").onclick = function () {
                    auth.login().then(
                        function success(data) {
                            document.getElementById("user").innerText = auth.user.name;
                            document.getElementById("expires").innerText = auth.expires.toString();
                        },
                        function error(e) {
                            // login failed, user not logged in
                        });
                };

Note in the example above, the `expires` property will be set to the date and time this token will expire.

You can logout by calling:

		auth.logout();

## Extended Tokens

By default, user access tokens have short expirations, lasting anywhere from 10 minutes to a few hours.  However, you can [exchange a short-term token for
a long-term token](https://developers.facebook.com/docs/howtos/login/extending-tokens/).  Facebook's token extension endpoint requires you to supply both
your App ID *and* your App Secret (Also available at the [Facebook Developer Portal](https://developers.facebook.com/apps)).  FBAuth.js will extend your token automatically, if you provide your App Secret or a proxy URL.

                var appID = "463501153695744";
                var secret = "cd97fdc5f7e12378040583df1467dae5";

                var auth = new FBAuth.AuthClient(
                    {
                        appID: appID,
                        secret: secret
                    });

                auth.login().then(
                    function success(data) {
                        // auth.expires will be several weeks from now
                        document.getElementById("user").innerText = auth.user.name;
                        document.getElementById("expires").innerText = auth.expires.toString();
                    },
                    function error(e) {
                        // login failed, user not logged in
                    });

### Protecting Your App Secret

It is not recommended to hard-code your App Secret into client applications.  Instead, you can store the App Secret on a server which you control, and
use your server to contact Facebook's OAuth endpoint on the client's behalf.  Simply pass in the `extendTokenUrl` to the constructor, pointing
it at an endpoint you maintain which mimics the querystring syntax of Facebook's OAuth endpoint:


                var appID = "463501153695744";
                var secret = "mrUPJ9QgHbmyhIO6g8SOuvuyqhc="; // not the real secret

                var auth = new FBAuth.AuthClient(
                    {
                        appID: appID,
                        secret: secret,
                        extendTokenUrl: "http://fbextendtoken.cloudapp.net/token/extend?client_id="
                    });

                auth.login().then(
                    function success(data) {
                        // auth.expires will be several weeks from now
                        document.getElementById("user").innerText = auth.user.name;
                        document.getElementById("expires").innerText = auth.expires.toString();
                    },
                    function error(e) {
                        // login failed, user not logged in
                    });

## Other Notes

If a valid short-term access token is obtained, but the attempt to exchange it for a long-term token fails, no error is thrown.  The short-term token is used instead.

If your token is getting close to expiring (check the `expires` property), you can manually call `getExtendedToken(token)` to have it exchanged.  If
successful, the `token` and `expires` properties on the auth object will be changed.