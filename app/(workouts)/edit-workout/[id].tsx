import { Text, View, ScrollView } from 'react-native'
import React, {useEffect, useState} from 'react'
import { useLocalSearchParams } from 'expo-router'
import Header from '../../../components/Header'
import { db } from '../../../db'
import { eq } from 'drizzle-orm'
import { templateExercises, exercises } from '../../../db/schema'

interface Exercise {
    id: number
    name: string
    muscleGroup: string
    equipment: string | null
    category: string | null
    instructions: string | null
    createdAt: Date
}

interface Template {
    id: number
    name: string
    exercises: Exercise[]
}
const EditTemplate = () => {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>()
    const [template, setTemplate] = useState<Template | null>(null)
    useEffect(() => {
        const loadTemplate = async () => {
            // Example: load the template and include related exercise rows using a left join.
            // Adjust the join condition (templateExercises.exerciseId) if your FK column has a different name.
            const res = await db
                .select({ template: templateExercises, exercise: exercises })
                .from(templateExercises)
                .leftJoin(exercises, eq(exercises.id, templateExercises.exerciseId))
                .where(eq(templateExercises.id, Number(id)))

            // `res` will be an array of rows where each row has { template, exercise } structure.
            // If you expect a single template (with possibly multiple exercise rows), group them here.
            if (res.length === 0) {
                setTemplate(null)
                return
            }

            // Group by template id to collect related exercises together
            const grouped: Template = {
                id: Number(id),
                name: name || 'Unknown Template',
                exercises: res.map(r => r.exercise).filter((ex): ex is Exercise => ex !== null),
            }

            setTemplate(grouped)
            console.log('response ', res)
        }
        loadTemplate().catch(console.error)

    }, [id]);

  return (
    <View className="bg-primary flex-1 ">
      <Header title={"Edit Template"} />
        <ScrollView className={"mx-5"}>
          <View className="p-4 mt-3 bg-secondary rounded-xl ">
              <Text className="text-tertiary font-spaceBold text-xl">{name}</Text>
          </View>
          {/* show related exercises loaded via the join */}
          {template?.exercises && template.exercises.length > 0 && (
            <View className="mt-4">
              <Text className="text-tertiary font-spaceBold text-lg">Exercises</Text>
              {template.exercises.map((ex: any, i: number) => (
                <View key={i} className="p-3 mt-2 bg-secondary rounded">
                  <Text className="text-tertiary">{ex?.name ?? ex?.title ?? 'Unnamed exercise'}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

    </View>
  )
}
