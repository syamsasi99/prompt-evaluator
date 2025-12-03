# Security Policy

## Supported Versions

We release patches for security vulnerabilities. The following versions are currently being supported with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 0.0.x   | :white_check_mark: |

## Reporting a Vulnerability

The Prompt Evaluator team takes security bugs seriously. We appreciate your efforts to responsibly disclose your findings and will make every effort to acknowledge your contributions.

### How to Report a Security Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to:

**syamsasi99@gmail.com**

Please include the following information in your report:

1. **Type of vulnerability** (e.g., XSS, SQL injection, command injection, etc.)
2. **Full paths of source file(s)** related to the manifestation of the issue
3. **Location of the affected source code** (tag/branch/commit or direct URL)
4. **Step-by-step instructions to reproduce the issue**
5. **Proof-of-concept or exploit code** (if possible)
6. **Impact of the issue**, including how an attacker might exploit it
7. **Your contact information** for follow-up questions

### What to Expect

When you report a security issue, you can expect:

1. **Acknowledgment**: We will acknowledge receipt of your report within 48 hours
2. **Assessment**: We will assess the issue and determine its severity and impact
3. **Updates**: We will keep you informed about our progress
4. **Resolution**: We will work on a fix and release it as soon as possible
5. **Credit**: We will credit you in the release notes (unless you prefer to remain anonymous)

### Response Timeline

- **Initial response**: Within 48 hours
- **Severity assessment**: Within 7 days
- **Fix development**: Depends on complexity (typically 7-30 days)
- **Security advisory**: Published after fix is released

## Security Best Practices for Users

### API Keys and Credentials

1. **Never commit API keys** to version control
2. **Use environment variables** for sensitive data
3. **Rotate API keys regularly**
4. **Use API keys with minimal required permissions**

### Running Evaluations

1. **Review generated YAML** before running evaluations
2. **Be cautious with custom providers** and verify endpoints
3. **Monitor API usage and costs**
4. **Keep the application updated** to the latest version

### Data Privacy

1. **Be aware of data sent to LLM APIs** - prompts and datasets are sent to external providers
2. **Avoid including PII** (Personally Identifiable Information) in test datasets
3. **Review LLM provider privacy policies** before use
4. **Use security testing features** to detect potential vulnerabilities in your prompts

### Application Security

1. **Download installers only from official sources**:
   - GitHub Releases: https://github.com/syamsasi99/prompt-evaluator/releases
2. **Verify installer integrity** if checksums are provided
3. **Keep your operating system updated**
4. **Use antivirus software** on Windows

## Known Security Considerations

### Electron Security

Prompt Evaluator is built with Electron. We follow Electron security best practices:

- Context isolation is enabled
- Node.js integration is disabled in renderer
- Remote module is disabled
- WebSecurity is enabled
- IPC communication is validated

### Third-Party Dependencies

We regularly monitor and update dependencies to address known vulnerabilities:

```bash
npm audit
```

### LLM Provider Security

When using LLM providers:

- API keys are stored locally in your system
- Prompts and datasets are sent to external LLM APIs
- Responses are received and displayed
- We recommend reviewing provider terms of service and privacy policies

### File System Access

The application requires file system access for:

- Saving/loading project files
- Storing evaluation history
- Running Promptfoo CLI

All file operations are restricted to user-selected directories.

## Security Features

### Built-in Security Testing

Prompt Evaluator includes OWASP LLM security testing capabilities:

- **LLM01**: Prompt Injection detection
- **LLM02**: Insecure Output Handling tests
- **LLM03**: Training Data Poisoning checks
- **LLM06**: Sensitive Information Disclosure detection
- **LLM07**: Insecure Plugin Design tests
- **LLM09**: Overreliance checks

These tests help you identify potential security vulnerabilities in your prompts and LLM applications.

### Validation

- Input validation on all user-provided data
- YAML configuration validation before execution
- Provider configuration validation
- Dataset schema validation

## Vulnerability Disclosure Policy

We follow a coordinated disclosure process:

1. **Reporter notifies us** of the vulnerability
2. **We confirm and assess** the vulnerability
3. **We develop and test** a fix
4. **We release the fix** in a new version
5. **We publish a security advisory** with details
6. **Public disclosure** after users have had time to update (typically 30 days)

## Security Updates

Security updates will be:

- Released as soon as possible
- Announced in release notes
- Highlighted in GitHub Security Advisories
- Communicated through project channels

## Bug Bounty Program

We currently do not have a bug bounty program, but we deeply appreciate security researchers who responsibly disclose vulnerabilities. We will:

- Publicly acknowledge your contribution (if desired)
- Credit you in release notes
- Keep you informed throughout the process

## Contact

For security concerns, contact:

**Email**: syamsasi99@gmail.com

For general questions or non-security issues, please use:

- GitHub Issues: https://github.com/syamsasi99/prompt-evaluator/issues
- GitHub Discussions: https://github.com/syamsasi99/prompt-evaluator/discussions

## Additional Resources

- [OWASP Top 10 for LLMs](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [Electron Security Best Practices](https://www.electronjs.org/docs/latest/tutorial/security)
- [Promptfoo Security Documentation](https://promptfoo.dev/docs/security)

---

Thank you for helping keep Prompt Evaluator and its users safe!
