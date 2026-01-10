-- Migrate template style from 'hidroterm' to 'corporate'
-- Update profiles
UPDATE profiles 
SET template_config = jsonb_set(template_config, '{style}', '"corporate"') 
WHERE template_config->>'style' = 'hidroterm';

-- Update companies
UPDATE companies 
SET template_config = jsonb_set(template_config, '{style}', '"corporate"') 
WHERE template_config->>'style' = 'hidroterm';

-- Update any other hardcoded template IDs in your database if applicable
-- For example, if there's a template record for Hidroterm
UPDATE invoice_templates
SET name = 'Corporate'
WHERE name = 'HidroTherm';
