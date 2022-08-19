window.appCookieJar = null;
async function getCookieJar(context) {
    lastContextZooi = context;
	console.log(context);
    const { meta } = context;

    if (!meta.requestId || !meta.workspaceId) {
        throw new Error(`Request ID or workspace ID not found`);
    }

    const workspace = await context.util.models.workspace.getById(meta.workspaceId);

    if (!workspace) {
        throw new Error(`Workspace not found for ${meta.workspaceId}`);
    }

    const cookieJar = await context.util.models.cookieJar.getOrCreateForWorkspace(workspace);

    if (!cookieJar) {
        throw new Error(`Cookie jar not found for ${meta.workspaceId}`);
    }

    window.appCookieJar = cookieJar;

    return cookieJar;
}

async function setHeaders(context) {
    const isExcluded = await context.store.hasItem(`excluded.${context.request.getId()}`);
    console.log('is excluded', isExcluded, context);
    if (isExcluded) {
        return false;
    }


    const globalHeaders = await context.request.getEnvironmentVariable("GLOBAL_HEADERS");
    if (!globalHeaders) {
        return;
    }

    for (const headerName of Object.keys(globalHeaders)) {
        const headerValue = globalHeaders[headerName];

        if (await context.request.hasHeader(headerName)) {
            continue;
        }

        await context.request.setHeader(headerName, headerValue);
    }
}

const exclueRequest = {
    label: 'Disable global headers',
    action: async (context, data) => {
        const { request } = data;
        context.store.setItem(`excluded.${request._id}`, "true");
    },
};

const excludeRequestGroup = {
    label: "Disable global headers",
    action: async (context, data) => {
        const { requests } = data;
        for (const request of requests) {
            await context.store.setItem(`excluded.${request._id}`, "true");
        }
    },
};

const includeRequest = {
    label: 'Enable global headers',
    action: async (context, data) => {
        const { request } = data;
        context.store.removeItem(`excluded.${request._id}`);
    }
};

const includeRequestGroup = {
    label: "Enable global headers",
    action: async (context, data) => {
        const { requests } = data;
        for (const request of requests) {
            await context.store.removeItem(`excluded.${request._id}`);
        }
    }
};

const sendAllRequestsInGroep = {
    label: 'Send Requests',
	action: async (context, data) => {
	  const { requests } = data;

	  let results = [];
	  for (const request of requests) {
	  	console.log(request);
	    const response = await context.network.sendRequest(request);
	    results.push(`<li>${request.name}: ${response.statusCode}</li>`);
	  }

	  const html = `<ul>${results.join('\n')}</ul>`;

	  context.app.showGenericModalDialog('Results', { html });
	},
};

exports.requestHooks = [setHeaders];
exports.requestActions = [exclueRequest, includeRequest];
exports.requestGroupActions = [excludeRequestGroup, includeRequestGroup, sendAllRequestsInGroep];
exports.templateTags = [{
    name: 'laravel_csrf',
    displayName: 'Laravel CSRF',
    description: 'Apply XSRF-TOKEN from cookie for X-XSRF-TOKEN request header',
    args: [
        {
            displayName: 'CSRF Cookie Name',
            type: 'string',
            defaultValue: 'XSRF-TOKEN',
            placeholder: 'It is "XSRF-TOKEN" by default in laravel',
        }
    ],
    async run(context, cookieName = 'XSRF-TOKEN') {
        const cookieJar = await this.getCookieJar(context);

        const token = cookieJar.cookies?.find(cookie => cookie.key === cookieName);

        
        if (!token) {
            const resendInProgress = await context.store.getItem(`resend_cookie_network`);
            if (! resendInProgress) {
                await context.store.setItem(`resend_cookie_network`, "true");
            }
            console.log('resend network for cookie');
            // const request = await context.util.models.request.getById('req_7354344b85ec48a3a49008367e4b07cf');
            console.log(request);
        	// context.network.sendRequest(request);
        }

        return decodeURIComponent(token?.value);
    },

    async getCookieJar(context) {
        const { meta } = context;

        if (!meta.requestId || !meta.workspaceId) {
            throw new Error(`Request ID or workspace ID not found`);
        }

        const workspace = await context.util.models.workspace.getById(meta.workspaceId);

        if (!workspace) {
            throw new Error(`Workspace not found for ${meta.workspaceId}`);
        }

        const cookieJar = await context.util.models.cookieJar.getOrCreateForWorkspace(workspace);

        if (!cookieJar) {
            throw new Error(`Cookie jar not found for ${meta.workspaceId}`);
        }

        return cookieJar;
    },
}];

document.querySelector('.sidebar__menu button').addEventListener('click', function () {

    console.log('jouw moeder');
})