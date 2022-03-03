import React from 'react';

function isStaging(frontendApi: string): boolean {
  return (
    frontendApi.endsWith('.lclstage.dev') ||
    frontendApi.endsWith('.stgstage.dev') ||
    frontendApi.endsWith('.clerkstage.dev')
  );
}

const getScriptUrl = (frontendApi: string, libVersion: string) => {
  const major = libVersion.includes('alpha') ? 'next' : isStaging(frontendApi) ? 'staging' : libVersion.split('.')[0];
  return `https://${frontendApi}/npm/@clerk/clerk-js@${major}/dist/clerk.browser.js`;
};

const createInterstitial = (frontendApi: string, libVersion: string) => {
  return `
    <head>
        <meta charset="UTF-8" />
    </head>
    <body>
        <script>
            window.startClerk = async () => {
                const Clerk = window.Clerk;
                try {
                    await Clerk.load({authVersion: 2});
                    window.location.reload();
                } catch (err) {
                    console.error('Clerk: ', err);
                }
            };
            (() => {
                const script = document.createElement('script');
                script.setAttribute('data-clerk-frontend-api', 'clerk.renewing.hermit-14.lcl.dev');
                script.async = true;
                script.src = "${getScriptUrl(frontendApi, libVersion)}";
                script.addEventListener('load', startClerk);
                document.body.appendChild(script);
            })();
        </script>
    </body>
`;
};

export function Interstitial({ frontendApi, version }: { frontendApi: string; version: string }) {
  return <html dangerouslySetInnerHTML={{ __html: createInterstitial(frontendApi, version) }} />;
}
