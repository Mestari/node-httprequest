/**
 * Http request service
 *
 * @author appr
 */

var url = require('url'),
    querystring = require('querystring'),
    net = require('net'),
    http = require('http')
    https = require('https')
;

/**
 * Service constructor
 *
 */
function Request() {

}

Request.HTTP_METHOD_GET = 'GET';
Request.HTTP_METHOD_POST = 'POST';

Request.HTTP_VERSION_1_1 = 'HTTP/1.1';

/**
 * Create socket
 *
 * @param host
 * @param port
 * @param callback
 */
Request.prototype.createSocket = function(host, port, callback) {

    var client = net.connect(
        port,
        host,
        function() {

            return callback(null, client);
        }
    );

    client.on('error', function(err) {

        return callback(err, null);
    });

    return client;
};

/**
 * Send info via keep-alive connection
 *
 * @param requestUrl
 * @param method
 * @param getData
 * @param postData
 * @param client
 */
Request.prototype.keepAlive = function(
    requestUrl,
    method,
    getData,
    postData,
    client
) {

    var parsedUrl = url.parse(requestUrl);

    var send = function(err, client) {
        if (err) {

            return client;
        }

        client.write(
            method
                + ' '
                + parsedUrl.pathname
                + (getData
                    ? ('?' + querystring.stringify(getData))
                    : ''
                )
                + ' ' + Request.HTTP_VERSION_1_1
                + '\r\n'
        );
        client.write('Host: ' + parsedUrl['hostname'] + '\r\n');
        client.write('Accept: */*\r\n');
        client.write('Connection: Keep-Alive\r\n');
        client.write('\r\n');

        return client;
    };

    if (!client) {

        return this.createSocket(
            parsedUrl.hostname,
            parsedUrl.port ? parsedUrl.port : 80,
            send
        );
    }

    return send(null, client);
};

/**
 * Execute simple http request
 *
 * @param requestUrl
 * @param method
 * @param getData
 * @param postData
 * @param headers
 * @param callback
 */
Request.prototype.close = function(
    requestUrl,
    method,
    getData,
    postData,
    headers,
    callback
) {
    var parsedUrl = url.parse(requestUrl, true);
    
    getData = getData || {};
    Object.keys(parsedUrl.query).forEach(function(it) {
        getData[it] = parsedUrl.query[it]
    });
 
    var options = {
            auth: parsedUrl.auth,
            hash: parsedUrl.hash,
            host: parsedUrl.hostname,
            port: parsedUrl.port || (parsedUrl.protocol == 'https:' ? 443 : 80),
            path: parsedUrl.pathname
                + (Object.keys(getData).length
                    ? ('?' + querystring.stringify(getData))
                    : ''
                ),
            method: method,
            headers: headers || {}
        }
    ;
    var req = (parsedUrl.protocol == 'https:' ? https : http).request(options, function(res) {
        res.setEncoding('utf8');
        var data = '';
        res.on('data', function(chunk) {
            data += chunk;
        });
        res.on('error', function(e) {
            callback(e, null, res);
        });
        res.on('end', function() {
            callback(null, data, res);
        });
    });
    req.on('error', function(e) {
        callback(e, null);
    });
    if (postData) {
        req.setHeader('Content-Length', Buffer.byteLength(postData, 'utf8'));
        req.write(postData);
    }
    req.end();
};

module.exports = Request;
