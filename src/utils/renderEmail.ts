import ejs from 'ejs'
import juice from 'juice'
import path from 'path'

const renderEmail = async (
	templateName: string,
	data: any,
): Promise<string> => {
	const templatePath = path.join(
		__dirname,
		'..',
		'views',
		`${templateName}.ejs`,
	)
	const html = await ejs.renderFile(templatePath, data)
	const inlinedHtml = juice(html as string)
	return inlinedHtml
}

export default renderEmail
