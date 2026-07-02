import { supabase } from '../utils/supabase'
import type { CancelSessionData, RegistrationStep, SessionStep, User } from '../types'

export interface RegisterUserInput {
  lineUserId: string
  fullName: string
  phone: string
  displayName?: string
}

export class UserRepository {
  async findByLineUserId(lineUserId: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('line_user_id', lineUserId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  }

  async createPending(lineUserId: string, displayName?: string): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .insert({
        line_user_id: lineUserId,
        display_name: displayName ?? null,
        registration_step: 'awaiting_name',
        is_registered: false,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async startRegistration(lineUserId: string, displayName?: string): Promise<User> {
    const existing = await this.findByLineUserId(lineUserId)
    if (existing) {
      if (existing.is_registered) return existing

      const { data, error } = await supabase
        .from('users')
        .update({ registration_step: 'awaiting_name' })
        .eq('line_user_id', lineUserId)
        .select()
        .single()

      if (error) throw error
      return data
    }

    return this.createPending(lineUserId, displayName)
  }

  async updateRegistrationStep(lineUserId: string, step: RegistrationStep | null, updates?: Partial<User>): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .update({ registration_step: step, ...updates })
      .eq('line_user_id', lineUserId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async completeRegistration(input: RegisterUserInput): Promise<User> {
    const existing = await this.findByLineUserId(input.lineUserId)

    const payload = {
      line_user_id: input.lineUserId,
      full_name: input.fullName,
      phone: input.phone,
      display_name: input.displayName ?? existing?.display_name ?? null,
      is_registered: true,
      registration_step: null,
    }

    if (existing) {
      const { data, error } = await supabase
        .from('users')
        .update(payload)
        .eq('line_user_id', input.lineUserId)
        .select()
        .single()

      if (error) throw error
      return data
    }

    const { data, error } = await supabase.from('users').insert(payload).select().single()
    if (error) throw error
    return data
  }

  async findOrCreate(lineUserId: string, displayName?: string): Promise<User> {
    const existing = await this.findByLineUserId(lineUserId)
    if (existing) return existing
    return this.createPending(lineUserId, displayName)
  }

  async setSession(
    lineUserId: string,
    step: SessionStep | null,
    data: CancelSessionData | null,
  ): Promise<User> {
    const { data: user, error } = await supabase
      .from('users')
      .update({ session_step: step, session_data: data })
      .eq('line_user_id', lineUserId)
      .select()
      .single()

    if (error) throw error
    return user
  }

  async clearSession(lineUserId: string): Promise<void> {
    await this.setSession(lineUserId, null, null)
  }
}

export const userRepository = new UserRepository()
