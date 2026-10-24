<script setup>
import { computed, ref } from 'vue'
import { addTag, cleanTag, suggestTags, TAG_MAX, TAGS_PER_BILL } from '@/lib/groups.js'

const props = defineProps({
  id: { type: String, required: true },
  /** Tags you have used on any bill, offered as you type. */
  known: { type: Array, default: () => [] },
})
const tags = defineModel({ type: Array, required: true })

const typed = ref('')
const full = computed(() => tags.value.length >= TAGS_PER_BILL)
const suggestions = computed(() => suggestTags(props.known, typed.value, tags.value).slice(0, 8))
/** What is typed, when it is not a tag you already use. */
const newTag = computed(() => {
  const tag = cleanTag(typed.value)
  if (!tag) return ''
  const lower = tag.toLocaleLowerCase()
  const exists = [...props.known, ...tags.value].some((item) => item.toLocaleLowerCase() === lower)
  return exists ? '' : tag
})

function add(value) {
  tags.value = addTag(tags.value, value, props.known)
  typed.value = ''
}

function remove(tag) {
  tags.value = tags.value.filter((item) => item !== tag)
}

/** Enter or a comma adds what is typed. */
function onKey(event) {
  if (event.key !== 'Enter' && event.key !== ',') return
  event.preventDefault()
  if (cleanTag(typed.value)) add(typed.value)
}
</script>

<template>
  <div class="grid gap-2">
    <ul v-if="tags.length" class="m-0 flex list-none flex-wrap gap-2 p-0" aria-label="Tags on this bill">
      <li v-for="tag in tags" :key="tag">
        <button type="button" class="chip" aria-pressed="true" :aria-label="`Remove ${tag}`" @click="remove(tag)">
          {{ tag }} <span aria-hidden="true" class="opacity-70">×</span>
        </button>
      </li>
    </ul>
    <input
      :id="id"
      v-model="typed"
      class="field"
      :maxlength="TAG_MAX"
      autocomplete="off"
      enterkeyhint="done"
      :disabled="full"
      :placeholder="full ? `Up to ${TAGS_PER_BILL} tags` : tags.length ? 'Add another tag' : 'Work, House…'"
      @keydown="onKey"
    >
    <div v-if="!full && (suggestions.length || newTag)" class="flex flex-wrap gap-2" role="group" aria-label="Add a tag">
      <button v-for="tag in suggestions" :key="tag" type="button" class="chip" @click="add(tag)">+ {{ tag }}</button>
      <button v-if="newTag" type="button" class="chip" @click="add(newTag)">+ New tag “{{ newTag }}”</button>
    </div>
  </div>
</template>
