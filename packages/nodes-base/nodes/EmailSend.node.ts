import {
	BINARY_ENCODING,
	IExecuteSingleFunctions,
} from 'n8n-core';
import {
	IDataObject,
	INodeTypeDescription,
	INodeExecutionData,
	INodeType,
} from 'n8n-workflow';

import { createTransport } from 'nodemailer';
import SMTPTransport = require('nodemailer/lib/smtp-transport');

export class EmailSend implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Send Email',
		name: 'emailSend',
		icon: 'fa:envelope',
		group: ['output'],
		version: 1,
		description: 'Sends an Email',
		defaults: {
			name: 'Send Email',
			color: '#00bb88',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'smtp',
				required: true,
			}
		],
		properties: [
			// TODO: Add cc, bcc and choice for text as text or html  (maybe also from name)
			{
				displayName: 'From Email',
				name: 'fromEmail',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'admin@example.com',
				description: 'Email address of the sender optional with name.',
			},
			{
				displayName: 'To Email',
				name: 'toEmail',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'info@example.com',
				description: 'Email address of the recipient.',
			},
			{
				displayName: 'CC Email',
				name: 'ccEmail',
				type: 'string',
				default: '',
				required: false,
				placeholder: 'cc@example.com',
				description: 'Email address of CC recipient.',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
				placeholder: 'My subject line',
				description: 'Subject line of the email.',
			},
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
					rows: 5,
				},
				default: '',
				description: 'Plain text message of email.',
			},
			{
				displayName: 'HTML',
				name: 'html',
				type: 'string',
				typeOptions: {
					rows: 5,
				},
				default: '',
				description: 'HTML text message of email.',
			},
			{
				displayName: 'Attachments',
				name: 'attachments',
				type: 'string',
				default: '',
				description: 'Name of the binary properties which contain<br />data which should be added to email as attachment.<br />Multiple ones can be comma separated.',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Ignore SSL Issues',
						name: 'allowUnauthorizedCerts',
						type: 'boolean',
						default: false,
						description: 'Do connect even if SSL certificate validation is not possible.',
					},
				],
			},
		],
	};


	async executeSingle(this: IExecuteSingleFunctions): Promise<INodeExecutionData> {
		const item = this.getInputData();

		const fromEmail = this.getNodeParameter('fromEmail') as string;
		const toEmail = this.getNodeParameter('toEmail') as string;
		const ccEmail = this.getNodeParameter('ccEmail') as string;
		const subject = this.getNodeParameter('subject') as string;
		const text = this.getNodeParameter('text') as string;
		const html = this.getNodeParameter('html') as string;
		const attachmentPropertyString = this.getNodeParameter('attachments') as string;
		const options = this.getNodeParameter('options', {}) as IDataObject;

		const credentials = this.getCredentials('smtp');

		if (credentials === undefined) {
			throw new Error('No credentials got returned!');
		}

		const connectionOptions: SMTPTransport.Options = {
			host: credentials.host as string,
			port: credentials.port as number,
			secure: credentials.secure as boolean,
			// @ts-ignore
			auth: {
				user: credentials.user,
				pass: credentials.password,
			}
		};

		if (options.allowUnauthorizedCerts === true) {
			connectionOptions.tls = {
				rejectUnauthorized: false
			};
		}

		const transporter = createTransport(connectionOptions);

		// setup email data with unicode symbols
		const mailOptions = {
			from: fromEmail,
			to: toEmail,
			cc: ccEmail,
			subject,
			text,
			html,
		};

		if (attachmentPropertyString && item.binary) {
			const attachments = [];
			const attachmentProperties: string[] = attachmentPropertyString.split(',').map((propertyName) => {
				return propertyName.trim();
			});

			for (const propertyName of attachmentProperties) {
				if (!item.binary.hasOwnProperty(propertyName)) {
					continue;
				}
				attachments.push({
					filename: item.binary[propertyName].fileName || 'unknown',
					content: Buffer.from(item.binary[propertyName].data, BINARY_ENCODING),
				});
			}

			if (attachments.length) {
				// @ts-ignore
				mailOptions.attachments = attachments;
			}
		}

		// Send the email
		const info = await transporter.sendMail(mailOptions);

		return { json: info };
	}

}
