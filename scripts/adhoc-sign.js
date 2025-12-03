const { execSync } = require('child_process');
const path = require('path');

exports.default = async function afterSign(context) {
  const { electronPlatformName, appOutDir } = context;

  // Only sign on macOS
  if (electronPlatformName !== 'darwin') {
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(appOutDir, `${appName}.app`);

  console.log('');
  console.log('🔐 Ad-hoc signing application...');
  console.log(`   App: ${appPath}`);

  try {
    // Ad-hoc sign the app bundle
    execSync(`codesign --force --deep --sign - "${appPath}"`, { stdio: 'inherit' });

    console.log('✅ Ad-hoc signing complete!');
    console.log('');
    console.log('ℹ️  Note: This is an ad-hoc signature (not from Apple Developer)');
    console.log('   Users will need to right-click → Open on first launch');
    console.log('');
  } catch (error) {
    console.warn('⚠️  Ad-hoc signing failed:', error.message);
    console.warn('   Continuing without signature...');
  }
};
