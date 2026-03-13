function parseJwt (token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
};

function init(response_type) {
    let btn = document.getElementById('btnAction');
    let info = document.getElementById('info');

    let params = new URLSearchParams(window.location.hash.substring(1));
    let id_token = params.get('id_token');
    let callback = window.location.origin + window.location.pathname;
    let clientId = window.WEBEX_CLIENT_ID;

    if (id_token) {
        claims = parseJwt(id_token);
        console.log(claims);

        info.innerHTML = 'User ID ' + claims.sub + ' with E-mail ' + claims.email;
        btn.href = window.location.pathname;
        btn.innerText = 'Logout';
    } else if (!clientId) {
        info.innerHTML = 'Set WEBEX_CLIENT_ID in the server environment and restart.';
        btn.style.display = 'none';
    } else {
        btn.href = 'https://webexapis.com/v1/authorize?'+
            'response_type=' + response_type +
            '&client_id=' + encodeURIComponent(clientId) +
            '&redirect_uri=' + encodeURIComponent(callback) +
            '&scope=openid%20email'+
            '&state=' + Math.random() +
            '&nonce=' + Math.random();
        btn.innerText = 'Login';
    }
}
