import cssIcon from 'devicon/icons/css3/css3-original.svg'
import htmlIcon from 'devicon/icons/html5/html5-original.svg'
import jsIcon from 'devicon/icons/javascript/javascript-original.svg'
import Dropdown from './Dropdown.jsx'
import { stackIds, stacks } from '../stacks/registry.js'
import { useI18n } from '../i18n/index.js'

const stackIcons = { html: htmlIcon, css: cssIcon, js: jsIcon }

// Stacks grouped by activity id (translated as activities.<id>) for the picker menu.
const stackGroups = stackIds.reduce((groups, id) => {
  const activity = stacks[id].activity ?? 'web'
  const group = groups.find((item) => item.activity === activity)
  if (group) group.ids.push(id)
  else groups.push({ activity, ids: [id] })
  return groups
}, [])

function StackLogo({ stackId }) {
  return (
    <span className={`language-logo-frame active-icon ${stackId}-frame`}>
      <img className="language-logo" src={stackIcons[stackId] ?? htmlIcon} alt="" aria-hidden="true" />
    </span>
  )
}

export default function StackPicker({ activeStackId, subtitle, onSelect }) {
  const { t } = useI18n()
  const groups = stackGroups.map((group) => ({
    id: group.activity,
    title: t(`activities.${group.activity}`),
    options: group.ids.map((id) => ({
      id,
      name: stacks[id].name,
      description: t(`stacks.${id}.description`),
      icon: <StackLogo stackId={id} />,
    })),
  }))

  return (
    <Dropdown
      className="stack-picker"
      buttonClass="brand"
      label={t('picker.label')}
      menuLabel={t('picker.menu')}
      groups={groups}
      value={activeStackId}
      onSelect={onSelect}>
      <StackLogo stackId={activeStackId} />
      <span className="brand-copy">
        <b>CodeTrail</b>
        <span className="brand-stack-name">{subtitle ?? stacks[activeStackId]?.name}</span>
      </span>
    </Dropdown>
  )
}
