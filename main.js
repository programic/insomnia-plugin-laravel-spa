async function getCookieJar(context) {
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

const excludeRequest = {
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
exports.requestActions = [excludeRequest, includeRequest];
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
        },
        {
            displayName: 'CSRF request',
            type: 'string',
            placeholder: 'Take the request id from your csrf request',
        }
    ],
    async run(context, cookieName = 'XSRF-TOKEN', requestId) {
        if (requestId) {
            const request = await context.util.models.request.getById(requestId);

            context.network.sendRequest(request);
        }

        const cookieJar = await this.getCookieJar(context);

        const token = cookieJar.cookies?.find(cookie => cookie.key === cookieName);

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
